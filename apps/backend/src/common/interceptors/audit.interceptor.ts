import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, switchMap, tap } from 'rxjs';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AUDIT_ACTION_KEY, AUDIT_ENTITY_KEY } from '../decorators/audit-entity.decorator';
import { CurrentUserDto } from '@ecocoop/shared';
import { Request } from 'express';

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
          tap(async (responseBody: unknown) => {
            try {
              const resolvedEntityId =
                entityId ??
                (responseBody && typeof responseBody === 'object' && 'id' in responseBody
                  ? (responseBody as { id: string }).id
                  : null);
              if (!resolvedEntityId) return;

              const newState =
                action !== AuditAction.DELETE
                  ? (responseBody as Prisma.InputJsonValue)
                  : Prisma.DbNull;

              await this.prisma.auditLog.create({
                data: {
                  entityType,
                  entityId: resolvedEntityId,
                  action,
                  previousState,
                  newState,
                  userId: user?.id ?? 'system',
                  ipAddress: request.ip,
                  userAgent: request.headers['user-agent'],
                },
              });
            } catch {
              // Audit failures must never break the main request
            }
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
