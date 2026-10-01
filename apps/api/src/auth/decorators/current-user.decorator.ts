import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/access-token.guard';

/** The user `AccessTokenGuard` authenticated the request as. Not available on `@Public()` routes. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
