import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

export const AUDIT_ENTITY_KEY = 'auditEntity';
export const AUDIT_ACTION_KEY = 'auditAction';
export const AuditEntity = (entityName: string) => SetMetadata(AUDIT_ENTITY_KEY, entityName);
export const AuditAsUpdate = () => SetMetadata(AUDIT_ACTION_KEY, AuditAction.UPDATE);
