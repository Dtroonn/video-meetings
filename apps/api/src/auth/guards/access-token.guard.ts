import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokensService } from '../services/tokens.service';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Registered globally (`APP_GUARD` in `AuthModule`), so every route requires a valid
 * `Authorization: Bearer <accessToken>` header unless it's marked `@Public()`.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing access token');
    }

    const { sub, email } = await this.tokens.verifyAccessToken(token);
    request.user = { id: sub, email };
    return true;
  }
}
