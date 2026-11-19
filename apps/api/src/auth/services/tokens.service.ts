import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { EnvironmentVariables } from '@/config/env.validation';
import type { User } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AccessTokenPayload, AuthTokens } from '../auth.types';

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

type SessionUser = Pick<User, 'id' | 'email'>;

type Transaction = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
type Db = PrismaService | Transaction;

/** Namespace of the advisory locks below, so they can't collide with other advisory locks. */
const SESSIONS_LOCK_NAMESPACE = 0x5e55;

/**
 * Takes the user's session lock until the end of the transaction: a transaction-scoped Postgres
 * advisory lock keyed by the user id. It locks no row of the users table (that belongs to the
 * users module), only serializes the auth code that rotates or replaces the user's sessions.
 */
const lockSessions = async (tx: Transaction, userId: string): Promise<void> => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SESSIONS_LOCK_NAMESPACE}::int, hashtext(${userId}::text))`;
};

const isAccessTokenPayload = (
  payload: Record<string, unknown>,
): payload is AccessTokenPayload & Record<string, unknown> =>
  typeof payload.sub === 'string' && typeof payload.email === 'string';

const isRefreshTokenPayload = (
  payload: Record<string, unknown>,
): payload is RefreshTokenPayload & Record<string, unknown> =>
  typeof payload.sub === 'string' && typeof payload.jti === 'string';

/**
 * Issues access/refresh token pairs, rotates and revokes refresh tokens.
 *
 * Access and refresh tokens are signed with different secrets, so one can't be passed off as the
 * other. Every refresh token has a row in `refresh_tokens` keyed by its `jti` (one row per
 * session); rotating a token deletes its row, so each refresh token works exactly once, while other
 * sessions of the same user keep their own rows. Rotation and `replaceSessions` take a per-user
 * lock, so ending all sessions can't miss one that's being rotated at the same moment.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /** Starts a new session for the user: stores a refresh token row and signs a token pair. */
  async issue(user: SessionUser): Promise<AuthTokens> {
    const jti = await this.createSession(this.prisma, user.id);
    return this.sign(user, jti);
  }

  /**
   * Ends every session of the user and starts a new one (after a password change). Runs under the
   * user's session lock, so a refresh that's rotating one of the old tokens meanwhile either
   * finishes first (and its new row is deleted here) or finds its row gone.
   */
  async replaceSessions(user: SessionUser): Promise<AuthTokens> {
    const jti = await this.prisma.$transaction(async (tx) => {
      await lockSessions(tx, user.id);
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      return this.createSession(tx, user.id);
    });
    return this.sign(user, jti);
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
   * Verifies a refresh token without using it up.
   *
   * @returns the user the token was issued to and the token's session id, for `rotateRefreshToken`.
   * @throws UnauthorizedException if the token isn't a valid, unexpired refresh token (whether it
   *   was already used is only known to `rotateRefreshToken`).
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
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
    return { sub: payload.sub, jti: payload.jti };
  }

  /**
   * Invalidates a verified refresh token and issues the next pair of its session. The delete of
   * the old row and the insert of the new one run in one transaction under the user's session
   * lock, so `replaceSessions` can't run between them and miss the new row.
   *
   * @param token what `verifyRefreshToken` returned.
   * @param user the token's user (`token.sub`), as currently stored.
   * @throws UnauthorizedException if the token was already used, revoked or has expired.
   */
  async rotateRefreshToken(token: RefreshTokenPayload, user: SessionUser): Promise<AuthTokens> {
    const jti = await this.prisma.$transaction(async (tx) => {
      await lockSessions(tx, user.id);
      // A conditional delete, so two concurrent requests can't both use the same token.
      const { count } = await tx.refreshToken.deleteMany({
        where: { id: token.jti, userId: token.sub, expiresAt: { gt: new Date() } },
      });
      if (count === 0) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return this.createSession(tx, user.id);
    });
    return this.sign(user, jti);
  }

  /**
   * Ends the session of a refresh token by deleting its row; other sessions of the user stay.
   * Idempotent: an already used or expired token is simply gone.
   *
   * @throws UnauthorizedException if the token isn't a valid refresh token.
   */
  async revokeRefreshToken(token: string): Promise<void> {
    // Verified first, so only the holder of a genuine token can end its session.
    const payload = await this.verifyRefreshToken(token);
    await this.prisma.refreshToken.deleteMany({ where: { id: payload.jti, userId: payload.sub } });
  }

  /** Stores a new refresh token row for the user; returns its id (the token's `jti`). */
  private async createSession(db: Db, userId: string): Promise<string> {
    const jti = randomUUID();
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    await db.refreshToken.create({
      data: { id: jti, userId, expiresAt: new Date(Date.now() + refreshTtl * 1000) },
    });
    return jti;
  }

  private async sign(user: SessionUser, jti: string): Promise<AuthTokens> {
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
          expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }),
          jwtid: jti,
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }
}
