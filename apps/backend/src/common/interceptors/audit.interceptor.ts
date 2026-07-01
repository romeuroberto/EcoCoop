import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, switchMap } from 'rxjs';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AUDIT_ACTION_KEY, AUDIT_ENTITY_KEY } from '../decorators/audit-entity.decorator';
import { CurrentUserDto } from '@ecocoop/shared';
import { Request } from 'express';

function toJsonSafe(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) return null as unknown as Prisma.InputJsonValue;
  if (Prisma.Decimal.isDecimal(value)) return (value as Prisma.Decimal).toNumber();
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonSafe) as Prisma.InputJsonValue;
  if (typeof value === 'object') {
    const result: Record<string, Prisma.InputJsonValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = toJsonSafe(v);
    }
    return result;
  }
  return value as Prisma.InputJsonValue;
}

const METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

type PrismaDelegate = {
  findUnique?: (args: unknown) => Promise<unknown>;
  findFirst?: (args?: unknown) => Promise<unknown>;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (!METHOD_TO_ACTION[method]) return next.handle();

    const entityType = this.reflector.get<string>(AUDIT_ENTITY_KEY, context.getClass());
    if (!entityType) return next.handle();

    const action =
      this.reflector.getAllAndOverride<AuditAction | undefined>(AUDIT_ACTION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? METHOD_TO_ACTION[method];
    const user = request.user as CurrentUserDto | undefined;
    const entityId = request.params?.id ?? null;

    return from(this.fetchPreviousState(action, entityType, entityId)).pipe(
      switchMap((previousState) =>
        next.handle().pipe(
          switchMap(async (responseBody: unknown) => {
            try {
              const resolvedEntityId =
                entityId ??
                (responseBody && typeof responseBody === 'object' && 'id' in responseBody
                  ? (responseBody as { id: string }).id
                  : null);
              if (!resolvedEntityId) return responseBody;

              const safePreviousState =
                previousState === Prisma.DbNull ? Prisma.DbNull : toJsonSafe(previousState);

              const newState =
                action !== AuditAction.DELETE
                  ? toJsonSafe(responseBody)
                  : Prisma.DbNull;

              await this.prisma.auditLog.create({
                data: {
                  entityType,
                  entityId: resolvedEntityId,
                  action,
                  previousState: safePreviousState,
                  newState,
                  userId: user?.id ?? 'system',
                  ipAddress: request.ip,
                  userAgent: request.headers['user-agent'],
                },
              });
            } catch (err) {
              // Audit failures must never break the main request
              this.logger.error(`Audit log failed for ${entityType}/${entityId}: ${(err as Error).message}`);
            }
            return responseBody;
          }),
        ),
      ),
    );
  }

  private async fetchPreviousState(
    action: AuditAction,
    entityType: string,
    entityId: string | null,
  ): Promise<Prisma.InputJsonValue | typeof Prisma.DbNull> {
    if (action === AuditAction.CREATE) return Prisma.DbNull;

    try {
      const model = (this.prisma as unknown as Record<string, PrismaDelegate>)[entityType];
      if (!model) return Prisma.DbNull;

      let record: unknown = null;
      if (entityId && model.findUnique) {
        record = await model.findUnique({ where: { id: entityId } });
      } else if (!entityId && model.findFirst) {
        // Singleton entities (e.g. cooperative) have no :id route param
        record = await model.findFirst();
      }

      return record ? (record as Prisma.InputJsonValue) : Prisma.DbNull;
    } catch {
      return Prisma.DbNull;
    }
  }
}
