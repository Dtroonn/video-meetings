import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthUser {
  id: string;
  email: string;
}

interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

const PASSWORD = 'Str0ng-Passw0rd!';

// Every test registers its own user, so tests don't depend on each other or on a clean database.
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

// Decoding only: the tests check what a token carries, not its signature (that's the API's job).
const jwt = new JwtService();

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const payload = jwt.decode<Record<string, unknown> | null>(token);
  expect(payload).toEqual(expect.any(Object));
  return payload as Record<string, unknown>;
};

const expectNoPassword = (value: Record<string, unknown>) => {
  for (const key of Object.keys(value)) {
    expect(key.toLowerCase()).not.toContain('password');
  }
  expect(JSON.stringify(value)).not.toContain(PASSWORD);
};

const expectTokenPair = ({ accessToken, refreshToken }: AuthTokens) => {
  expect(accessToken).not.toHaveLength(0);
  expect(refreshToken).not.toHaveLength(0);
  expect(refreshToken).not.toBe(accessToken);
};

/** Register/login response: the user (without the password) plus a token pair. */
const expectAuthResponse = (body: unknown, email: string): AuthResponse => {
  expect(body).toEqual({
    user: expect.objectContaining({ id: expect.any(String) as unknown, email }) as unknown,
    accessToken: expect.any(String) as unknown,
    refreshToken: expect.any(String) as unknown,
  });
  const response = body as AuthResponse;
  expectNoPassword(response.user as unknown as Record<string, unknown>);
  expectTokenPair(response);
  return response;
};

/** Refresh response: a token pair only. */
const expectTokens = (body: unknown): AuthTokens => {
  expect(body).toEqual({
    accessToken: expect.any(String) as unknown,
    refreshToken: expect.any(String) as unknown,
  });
  const tokens = body as AuthTokens;
  expectTokenPair(tokens);
  return tokens;
};

const expectAccessTokenFor = (accessToken: string, user: AuthUser) => {
  const payload = decodeJwtPayload(accessToken);
  expect(payload.sub).toBe(user.id);
  expect(payload.email).toBe(user.email);
  expect(payload.exp).toEqual(expect.any(Number));
  expectNoPassword(payload);
};

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const register = (body: object) => request(app.getHttpServer()).post('/auth/register').send(body);
  const login = (body: object) => request(app.getHttpServer()).post('/auth/login').send(body);
  const refresh = (body: object) => request(app.getHttpServer()).post('/auth/refresh').send(body);

  const registerUser = async (email = uniqueEmail()) => {
    const res = await register({ email, password: PASSWORD }).expect(201);
    return expectAuthResponse(res.body, email);
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates a user and returns it with an access and a refresh token', async () => {
      const email = uniqueEmail();

      const res = await register({ email, password: PASSWORD }).expect(201);

      expectAuthResponse(res.body, email);
    });

    it('does not return the password or its hash with the user', async () => {
      const { user } = await registerUser();

      expectNoPassword(user as unknown as Record<string, unknown>);
    });

    it('puts the user info, without the password, into the access token payload', async () => {
      const { user, accessToken } = await registerUser();

      expectAccessTokenFor(accessToken, user);
    });

    it('rejects an email that is already registered', async () => {
      const { user } = await registerUser();

      await register({ email: user.email, password: PASSWORD }).expect(409);
    });

    it.each([
      ['email is missing', { password: PASSWORD }],
      ['password is missing', { email: 'missing-password@example.com' }],
      ['email is invalid', { email: 'not-an-email', password: PASSWORD }],
      ['password is too short', { email: 'short-password@example.com', password: 'Ab1!' }],
      ['email is not a string', { email: 42, password: PASSWORD }],
      ['password is not a string', { email: 'number-password@example.com', password: 12345678 }],
    ])('returns 400 when %s', async (_case, body) => {
      await register(body).expect(400);
    });

    it('does not create a user when validation fails', async () => {
      const email = uniqueEmail();
      await register({ email, password: 'Ab1!' }).expect(400);

      await login({ email, password: 'Ab1!' }).expect(401);
    });
  });

  describe('POST /auth/login', () => {
    it('returns the user with an access and a refresh token for valid credentials', async () => {
      const { user } = await registerUser();

      const res = await login({ email: user.email, password: PASSWORD }).expect(200);

      expectAuthResponse(res.body, user.email);
    });

    it('returns the same user that registered', async () => {
      const { user: registered } = await registerUser();

      const res = await login({ email: registered.email, password: PASSWORD }).expect(200);

      expect(expectAuthResponse(res.body, registered.email).user).toEqual(registered);
    });

    it('issues an access token for that user, without the password', async () => {
      const { user } = await registerUser();

      const res = await login({ email: user.email, password: PASSWORD }).expect(200);

      expectAccessTokenFor(expectAuthResponse(res.body, user.email).accessToken, user);
    });

    it('returns 401 for a wrong password', async () => {
      const { user } = await registerUser();

      await login({ email: user.email, password: `${PASSWORD}-wrong` }).expect(401);
    });

    it('returns 401 for an unknown email', async () => {
      await login({ email: uniqueEmail(), password: PASSWORD }).expect(401);
    });

    it('does not reveal whether the email or the password was wrong', async () => {
      const { user } = await registerUser();

      const wrongPassword = await login({
        email: user.email,
        password: `${PASSWORD}-wrong`,
      }).expect(401);
      const unknownEmail = await login({ email: uniqueEmail(), password: PASSWORD }).expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });

    it.each([
      ['email is missing', { password: PASSWORD }],
      ['password is missing', { email: 'missing-password@example.com' }],
      ['email is invalid', { email: 'not-an-email', password: PASSWORD }],
    ])('returns 400 when %s', async (_case, body) => {
      await login(body).expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns a new access and refresh token for a valid refresh token', async () => {
      const { refreshToken } = await registerUser();

      const res = await refresh({ refreshToken }).expect(200);

      expect(expectTokens(res.body).refreshToken).not.toBe(refreshToken);
    });

    it('issues an access token for the same user, without the password', async () => {
      const { user, refreshToken } = await registerUser();

      const res = await refresh({ refreshToken }).expect(200);

      expectAccessTokenFor(expectTokens(res.body).accessToken, user);
    });

    it('accepts a refresh token issued by login', async () => {
      const { user } = await registerUser();
      const loginRes = await login({ email: user.email, password: PASSWORD }).expect(200);

      const res = await refresh({
        refreshToken: expectAuthResponse(loginRes.body, user.email).refreshToken,
      }).expect(200);

      expectTokens(res.body);
    });

    it('rotates refresh tokens: a used refresh token cannot be used again', async () => {
      const { refreshToken } = await registerUser();
      await refresh({ refreshToken }).expect(200);

      await refresh({ refreshToken }).expect(401);
    });

    it('accepts the rotated refresh token', async () => {
      const { refreshToken } = await registerUser();
      const first = await refresh({ refreshToken }).expect(200);

      const second = await refresh({ refreshToken: expectTokens(first.body).refreshToken }).expect(
        200,
      );

      expectTokens(second.body);
    });

    it('keeps refresh tokens of other sessions valid', async () => {
      const { user, refreshToken: registerSession } = await registerUser();
      const loginRes = await login({ email: user.email, password: PASSWORD }).expect(200);
      const loginSession = expectAuthResponse(loginRes.body, user.email).refreshToken;

      await refresh({ refreshToken: loginSession }).expect(200);

      await refresh({ refreshToken: registerSession }).expect(200);
    });

    it('returns 401 when an access token is used as a refresh token', async () => {
      const { accessToken } = await registerUser();

      await refresh({ refreshToken: accessToken }).expect(401);
    });

    it('returns 401 for a refresh token whose payload was tampered with', async () => {
      const victim = await registerUser();
      const attacker = await registerUser();
      const [header, , signature] = attacker.refreshToken.split('.');
      const forgedPayload = Buffer.from(
        JSON.stringify({ ...decodeJwtPayload(attacker.refreshToken), sub: victim.user.id }),
      ).toString('base64url');

      await refresh({ refreshToken: [header, forgedPayload, signature].join('.') }).expect(401);
    });

    it('returns 401 for a malformed refresh token', async () => {
      await refresh({ refreshToken: 'not-a-token' }).expect(401);
    });

    it.each([
      ['refreshToken is missing', {}],
      ['refreshToken is empty', { refreshToken: '' }],
      ['refreshToken is not a string', { refreshToken: 42 }],
    ])('returns 400 when %s', async (_case, body) => {
      await refresh(body).expect(400);
    });
  });
});
