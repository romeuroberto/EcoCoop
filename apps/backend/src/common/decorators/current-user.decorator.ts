import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserDto } from '@ecocoop/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
