import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { EnvironmentVariables } from '@/config/env.validation';
import type { User } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AccessTokenPayload, AuthTokens } from '../auth.types';

interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

const isAccessTokenPayload = (
  payload: Record<string, unknown>,
): payload is AccessTokenPayload & Record<string, unknown> =>
  typeof payload.sub === 'string' && typeof payload.email === 'string';

const isRefreshTokenPayload = (
  payload: Record<string, unknown>,
): payload is RefreshTokenPayload & Record<string, unknown> =>
  typeof payload.sub === 'string' && typeof payload.jti === 'string';

/**
 * Issues access/refresh token pairs and consumes refresh tokens.
 *
 * Access and refresh tokens are signed with different secrets, so one can't be passed off as the
 * other. Every refresh token has a row in `refresh_tokens` keyed by its `jti`; consuming a token
 * deletes the row, so each refresh token works exactly once (rotation), while other sessions of the
 * same user keep their own rows.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async issue(user: Pick<User, 'id' | 'email'>): Promise<AuthTokens> {
    const jti = randomUUID();
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });

    await this.prisma.refreshToken.create({
      data: { id: jti, userId: user.id, expiresAt: new Date(Date.now() + refreshTtl * 1000) },
    });

    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      }),
      this.jwt.signAsync(
        { sub: user.id },
        {
          secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
          expiresIn: refreshTtl,
          jwtid: jti,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Verifies an access token. Stateless: it's short-lived, so there's no DB lookup.
   *
   * @throws UnauthorizedException if the token is invalid or expired (including a refresh token,
   *   which is signed with a different secret).
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
    if (!isAccessTokenPayload(payload)) {
      throw new UnauthorizedException('Invalid access token');
    }

    return { sub: payload.sub, email: payload.email };
  }

  /**
   * Verifies a refresh token and invalidates it.
   *
   * @returns the id of the user the token was issued to.
   * @throws UnauthorizedException if the token is invalid, expired or was already used.
   */
  async consumeRefreshToken(token: string): Promise<string> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!isRefreshTokenPayload(payload)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // A single conditional delete, so two concurrent requests can't both use the same token.
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { id: payload.jti, userId: payload.sub, expiresAt: { gt: new Date() } },
    });
    if (count === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return payload.sub;
  }
}
