import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_TOKEN_COOKIE } from '@video-meetings/contracts';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokensService } from '../services/tokens.service';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Registered globally (`APP_GUARD` in `AuthModule`), so every route requires a valid access token
 * unless it's marked `@Public()`. The token comes from the `Authorization: Bearer <accessToken>`
 * header, or, without one, from the web app's httpOnly `access_token` cookie: browser code can't
 * read that cookie to build the header, but the browser sends it with same-origin `/api/*`
 * requests. The header wins when both are present.
 *
 * Accepting a cookie opens the door to CSRF; it stays closed because the cookie is `SameSite=Lax`
 * (not sent with cross-site `POST`/`fetch`) and no endpoint changes state on `GET`. Keep it that way.
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
    const token = bearerToken(request) ?? cookieToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const { sub, email } = await this.tokens.verifyAccessToken(token);
    request.user = { id: sub, email };
    return true;
  }
}

function bearerToken(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' && token ? token : undefined;
}

/** `request.cookies` is filled by the `cookie-parser` middleware registered in `AppModule`. */
function cookieToken(request: Request): string | undefined {
  // Express types `cookies` as `any`.
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof token === 'string' && token ? token : undefined;
}
