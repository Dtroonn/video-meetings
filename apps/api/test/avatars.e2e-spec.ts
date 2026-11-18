import { randomUUID } from 'node:crypto';
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AVATAR_MAX_SIZE } from '@video-meetings/contracts';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';

const PASSWORD = 'Str0ng-Passw0rd!';

// Set by `vitest.config.e2e.ts`, so test uploads don't land in the dev uploads folder.
const UPLOADS_DIR = process.env.UPLOADS_DIR as string;

const uniqueEmail = () => `user-${randomUUID()}@example.com`;

// 1×1 images of every allowed type, plus a GIF (an image, but not an allowed one).
const IMAGES = {
  'image/png': Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
  'image/jpeg': Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'base64',
  ),
  'image/webp': Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64'),
} as const;
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const TEXT = Buffer.from('just some text, not an image\n');

/** A PNG of exactly `size` bytes: a real PNG start (what the api sniffs), padded with zeros. */
const pngOfSize = (size: number) =>
  Buffer.concat([IMAGES['image/png'], Buffer.alloc(size - IMAGES['image/png'].length)]);

interface TestUser {
  id: string;
  accessToken: string;
}

interface Me {
  id: string;
  avatarUrl: string | null;
}

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

describe('Avatars (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => request(app.getHttpServer());

  const registerUser = async (): Promise<TestUser> => {
    const res = await server()
      .post('/auth/register')
      .send({ email: uniqueEmail(), password: PASSWORD })
      .expect(201);
    const { accessToken, user } = res.body as { accessToken: string; user: { id: string } };
    return { accessToken, id: user.id };
  };

  const getMe = async (user: TestUser): Promise<Me> => {
    const res = await server().get('/users/me').auth(user.accessToken, { type: 'bearer' });
    expect(res.status).toBe(200);
    return res.body as Me;
  };

  const uploadAvatar = (user: TestUser, content: Buffer, type = 'image/png') =>
    server()
      .put('/users/me/avatar')
      .auth(user.accessToken, { type: 'bearer' })
      .set('Content-Type', type)
      .send(content);

  const removeAvatar = (user: TestUser) =>
    server().delete('/users/me/avatar').auth(user.accessToken, { type: 'bearer' });

  /** Loads an avatar URL from a user response the way the browser does (path on the api). */
  const loadAvatar = (url: string, viewer?: TestUser) => {
    const req = server().get(url).buffer(true);
    return viewer ? req.auth(viewer.accessToken, { type: 'bearer' }) : req;
  };

  /** The files stored for a user's avatar. */
  const storedAvatars = async (user: TestUser) => {
    const dir = path.join(UPLOADS_DIR, 'avatars', user.id);
    return (await exists(dir)) ? readdir(dir) : [];
  };

  const expectAvatar = async (user: TestUser, content: Buffer, type: string) => {
    const { avatarUrl } = await getMe(user);
    expect(avatarUrl).toEqual(expect.any(String));
    const res = await loadAvatar(avatarUrl as string, user).expect(200);
    expect(res.headers['content-type']).toBe(type);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(res.body as Buffer, content)).toBe(0);
    expect(await storedAvatars(user)).toHaveLength(1);
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/me', () => {
    it('has no avatar URL for a new user', async () => {
      const user = await registerUser();

      expect((await getMe(user)).avatarUrl).toBeNull();
    });
  });

  describe('PUT /users/me/avatar', () => {
    it.each(Object.entries(IMAGES))('uploads a %s avatar', async (type, content) => {
      const user = await registerUser();

      const res = await uploadAvatar(user, content, type).expect(200);

      const body = res.body as Me;
      expect(body.id).toBe(user.id);
      expect(body.avatarUrl).toMatch(new RegExp(`^/users/${user.id}/avatar\\?v=`));
      await expectAvatar(user, content, type);
    });

    it('takes the type from the content, not from Content-Type', async () => {
      const user = await registerUser();

      await uploadAvatar(user, IMAGES['image/webp'], 'application/octet-stream').expect(200);

      await expectAvatar(user, IMAGES['image/webp'], 'image/webp');
    });

    it('accepts an image of exactly the size limit', async () => {
      const user = await registerUser();
      const content = pngOfSize(AVATAR_MAX_SIZE);

      await uploadAvatar(user, content).expect(200);

      await expectAvatar(user, content, 'image/png');
    });

    it('replaces the avatar, removes the old file and changes the URL', async () => {
      const user = await registerUser();
      await uploadAvatar(user, IMAGES['image/png']).expect(200);
      const before = await getMe(user);
      const [oldFile] = await storedAvatars(user);

      await uploadAvatar(user, IMAGES['image/jpeg'], 'image/jpeg').expect(200);

      const after = await getMe(user);
      expect(after.avatarUrl).not.toBe(before.avatarUrl);
      await expectAvatar(user, IMAGES['image/jpeg'], 'image/jpeg');
      expect(await storedAvatars(user)).not.toContain(oldFile);
    });

    it.each([
      ['a text file', TEXT, 'text/plain'],
      ['a text file sent as a PNG', TEXT, 'image/png'],
      ['a GIF', GIF, 'image/gif'],
      ['a GIF sent as a PNG', GIF, 'image/png'],
      ['an empty body', Buffer.alloc(0), 'image/png'],
    ])('rejects %s with 400 and keeps the old avatar', async (_, content, type) => {
      const user = await registerUser();
      await uploadAvatar(user, IMAGES['image/png']).expect(200);
      const before = await getMe(user);

      await uploadAvatar(user, content, type).expect(400);

      expect(await getMe(user)).toEqual(before);
      await expectAvatar(user, IMAGES['image/png'], 'image/png');
    });

    it('rejects a file of 5 MB + 1 byte with 400 and keeps the old avatar', async () => {
      const user = await registerUser();
      await uploadAvatar(user, IMAGES['image/png']).expect(200);
      const before = await getMe(user);

      // The api rejects it from `Content-Length` without reading the body (and closes the
      // connection), so only declare the size: a client still writing 5 MB would see a reset.
      await uploadAvatar(user, Buffer.from('x'))
        .set('Content-Length', String(AVATAR_MAX_SIZE + 1))
        .expect(400);

      expect(await getMe(user)).toEqual(before);
      await expectAvatar(user, IMAGES['image/png'], 'image/png');
    });

    it('rejects a non-image file for a user without an avatar and leaves none', async () => {
      const user = await registerUser();

      await uploadAvatar(user, TEXT, 'image/png').expect(400);

      expect((await getMe(user)).avatarUrl).toBeNull();
      expect(await storedAvatars(user)).toEqual([]);
    });

    it('returns 401 without a session', async () => {
      await server()
        .put('/users/me/avatar')
        .set('Content-Type', 'image/png')
        .send(IMAGES['image/png'])
        .expect(401);
    });

    it("never changes another user's avatar", async () => {
      const alice = await registerUser();
      const bob = await registerUser();
      await uploadAvatar(bob, IMAGES['image/png']).expect(200);
      const bobBefore = await getMe(bob);

      // There's no route taking a user id for changes.
      await server()
        .put(`/users/${bob.id}/avatar`)
        .auth(alice.accessToken, { type: 'bearer' })
        .set('Content-Type', 'image/jpeg')
        .send(IMAGES['image/jpeg'])
        .expect(404);
      await server()
        .delete(`/users/${bob.id}/avatar`)
        .auth(alice.accessToken, { type: 'bearer' })
        .expect(404);
      await uploadAvatar(alice, IMAGES['image/jpeg'], 'image/jpeg').expect(200);
      await removeAvatar(alice).expect(204);

      expect(await getMe(bob)).toEqual(bobBefore);
      await expectAvatar(bob, IMAGES['image/png'], 'image/png');
    });
  });

  describe('DELETE /users/me/avatar', () => {
    it('removes the avatar and its file', async () => {
      const user = await registerUser();
      await uploadAvatar(user, IMAGES['image/png']).expect(200);
      const { avatarUrl } = await getMe(user);

      await removeAvatar(user).expect(204);

      expect((await getMe(user)).avatarUrl).toBeNull();
      expect(await storedAvatars(user)).toEqual([]);
      await loadAvatar(avatarUrl as string, user).expect(404);
    });

    it('succeeds when there is no avatar', async () => {
      const user = await registerUser();

      await removeAvatar(user).expect(204);

      expect((await getMe(user)).avatarUrl).toBeNull();
    });

    it('returns 401 without a session', async () => {
      await server().delete('/users/me/avatar').expect(401);
    });
  });

  describe('GET /users/:id/avatar', () => {
    it("serves a user's avatar to another signed-in user", async () => {
      const owner = await registerUser();
      const viewer = await registerUser();
      await uploadAvatar(owner, IMAGES['image/jpeg'], 'image/jpeg').expect(200);
      const { avatarUrl } = await getMe(owner);

      const res = await loadAvatar(avatarUrl as string, viewer).expect(200);

      expect(res.headers['content-type']).toBe('image/jpeg');
      expect(Buffer.compare(res.body as Buffer, IMAGES['image/jpeg'])).toBe(0);
    });

    it('returns 401 without a session', async () => {
      const user = await registerUser();
      await uploadAvatar(user, IMAGES['image/png']).expect(200);
      const { avatarUrl } = await getMe(user);

      await loadAvatar(avatarUrl as string).expect(401);
    });

    it('returns 404 for a user without an avatar and for an unknown user', async () => {
      const viewer = await registerUser();

      await loadAvatar(`/users/${viewer.id}/avatar`, viewer).expect(404);
      await loadAvatar(`/users/${randomUUID()}/avatar`, viewer).expect(404);
    });

    it('returns 400 for an id that is not a UUID', async () => {
      const viewer = await registerUser();

      await loadAvatar('/users/not-a-uuid/avatar', viewer).expect(400);
    });
  });
});
