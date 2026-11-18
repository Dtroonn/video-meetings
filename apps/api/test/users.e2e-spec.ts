import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';

const PASSWORD = 'Str0ng-Passw0rd!';

// Every test registers its own user, so tests don't depend on each other or on a clean database.
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

interface Profile {
  name: string | null;
  dateOfBirth: string | null;
  gender: string | null;
}

/** Today's date as `YYYY-MM-DD` in UTC, shifted by `days`. */
const utcDate = (days = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const EMPTY_PROFILE: Profile = { name: null, dateOfBirth: null, gender: null };

describe('Users (e2e)', () => {
  let app: INestApplication<App>;

  const registerUser = async () => {
    const email = uniqueEmail();
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);
    const { accessToken, user } = res.body as { accessToken: string; user: { id: string } };
    return { accessToken, id: user.id, email };
  };

  const getMe = (accessToken: string) =>
    request(app.getHttpServer()).get('/users/me').auth(accessToken, { type: 'bearer' });

  const updateMe = (accessToken: string, body: object) =>
    request(app.getHttpServer())
      .patch('/users/me')
      .auth(accessToken, { type: 'bearer' })
      .send(body);

  const readProfile = async (accessToken: string): Promise<Profile> => {
    const res = await getMe(accessToken).expect(200);
    const { name, dateOfBirth, gender } = res.body as Profile;
    return { name, dateOfBirth, gender };
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

  describe('GET /users/me', () => {
    it('returns an empty profile for a new user, without the password', async () => {
      const { accessToken, id, email } = await registerUser();

      const res = await getMe(accessToken).expect(200);

      expect(res.body).toEqual({
        id,
        email,
        ...EMPTY_PROFILE,
        avatarUrl: null,
        createdAt: expect.any(String) as unknown,
        updatedAt: expect.any(String) as unknown,
      });
      expect(JSON.stringify(res.body).toLowerCase()).not.toContain('password');
    });

    it('returns 401 without a session', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('sets all fields and returns the updated user', async () => {
      const { accessToken, id, email } = await registerUser();
      const profile = { name: 'Alice', dateOfBirth: '1990-05-17', gender: 'female' };

      const res = await updateMe(accessToken, profile).expect(200);

      expect(res.body).toEqual(expect.objectContaining({ id, email, ...profile }));
      expect(JSON.stringify(res.body).toLowerCase()).not.toContain('password');
      expect(await readProfile(accessToken)).toEqual(profile);
    });

    it('changes each field', async () => {
      const { accessToken } = await registerUser();
      await updateMe(accessToken, {
        name: 'Alice',
        dateOfBirth: '1990-05-17',
        gender: 'female',
      }).expect(200);

      await updateMe(accessToken, { name: 'Bob' }).expect(200);
      expect(await readProfile(accessToken)).toEqual({
        name: 'Bob',
        dateOfBirth: '1990-05-17',
        gender: 'female',
      });

      await updateMe(accessToken, { dateOfBirth: '1985-12-31' }).expect(200);
      expect(await readProfile(accessToken)).toEqual({
        name: 'Bob',
        dateOfBirth: '1985-12-31',
        gender: 'female',
      });

      await updateMe(accessToken, { gender: 'male' }).expect(200);
      expect(await readProfile(accessToken)).toEqual({
        name: 'Bob',
        dateOfBirth: '1985-12-31',
        gender: 'male',
      });
    });

    it.each([
      ['name', { name: null }, { dateOfBirth: '1990-05-17', gender: 'female' }],
      ['date of birth', { dateOfBirth: null }, { name: 'Alice', gender: 'female' }],
      ['gender', { gender: null }, { name: 'Alice', dateOfBirth: '1990-05-17' }],
    ])('clears the %s with null and keeps the other fields', async (_field, change, kept) => {
      const { accessToken } = await registerUser();
      await updateMe(accessToken, {
        name: 'Alice',
        dateOfBirth: '1990-05-17',
        gender: 'female',
      }).expect(200);

      await updateMe(accessToken, change).expect(200);

      expect(await readProfile(accessToken)).toEqual({ ...EMPTY_PROFILE, ...kept });
    });

    it('clears everything at once', async () => {
      const { accessToken } = await registerUser();
      await updateMe(accessToken, {
        name: 'Alice',
        dateOfBirth: '1990-05-17',
        gender: 'female',
      }).expect(200);

      await updateMe(accessToken, { name: null, dateOfBirth: null, gender: null }).expect(200);

      expect(await readProfile(accessToken)).toEqual(EMPTY_PROFILE);
    });

    it('changes nothing for an empty body', async () => {
      const { accessToken } = await registerUser();
      await updateMe(accessToken, { name: 'Alice', gender: 'male' }).expect(200);

      await updateMe(accessToken, {}).expect(200);

      expect(await readProfile(accessToken)).toEqual({
        name: 'Alice',
        dateOfBirth: null,
        gender: 'male',
      });
    });

    it('trims the name', async () => {
      const { accessToken } = await registerUser();

      await updateMe(accessToken, { name: '  Alice Smith  ' }).expect(200);

      expect((await readProfile(accessToken)).name).toBe('Alice Smith');
    });

    it.each([
      ['an empty name', ''],
      ['a name of only spaces', '   \t '],
    ])('stores %s as empty', async (_case, name) => {
      const { accessToken } = await registerUser();
      await updateMe(accessToken, { name: 'Alice' }).expect(200);

      await updateMe(accessToken, { name }).expect(200);

      expect((await readProfile(accessToken)).name).toBeNull();
    });

    it('accepts a 50-character name, also with spaces around it', async () => {
      const { accessToken } = await registerUser();
      const name = 'a'.repeat(50);

      await updateMe(accessToken, { name: `  ${name}  ` }).expect(200);

      expect((await readProfile(accessToken)).name).toBe(name);
    });

    it.each([
      ['the first allowed date', '1900-01-01'],
      ['today', utcDate()],
    ])('accepts %s as the date of birth', async (_case, dateOfBirth) => {
      const { accessToken } = await registerUser();

      await updateMe(accessToken, { dateOfBirth }).expect(200);

      expect((await readProfile(accessToken)).dateOfBirth).toBe(dateOfBirth);
    });

    it.each([
      ['the name is over 50 characters', { name: 'a'.repeat(51) }],
      ['the name is not a string', { name: 42 }],
      ['the date of birth is tomorrow', { dateOfBirth: utcDate(1) }],
      ['the date of birth is in the far future', { dateOfBirth: '2999-01-01' }],
      ['the date of birth is before 1900-01-01', { dateOfBirth: '1899-12-31' }],
      ['the date of birth does not exist', { dateOfBirth: '1990-02-30' }],
      ['the date of birth has a time', { dateOfBirth: '1990-05-17T00:00:00.000Z' }],
      ['the date of birth is not a date', { dateOfBirth: 'yesterday' }],
      ['the date of birth is empty', { dateOfBirth: '' }],
      ['the gender is unknown', { gender: 'other' }],
      ['the gender is in another case', { gender: 'MALE' }],
      ['the gender is empty', { gender: '' }],
      ['an unknown field is sent', { email: 'other@example.com' }],
    ])('returns 400 and changes nothing when %s', async (_case, body) => {
      const { accessToken } = await registerUser();
      const profile = { name: 'Alice', dateOfBirth: '1990-05-17', gender: 'female' };
      await updateMe(accessToken, profile).expect(200);

      await updateMe(accessToken, { name: 'Changed', ...body }).expect(400);

      expect(await readProfile(accessToken)).toEqual(profile);
    });

    it('returns 401 without a session', async () => {
      await request(app.getHttpServer()).patch('/users/me').send({ name: 'Alice' }).expect(401);
    });

    it("never changes another user's profile", async () => {
      const alice = await registerUser();
      const bob = await registerUser();
      const bobProfile = { name: 'Bob', dateOfBirth: '1980-01-02', gender: 'male' };
      await updateMe(bob.accessToken, bobProfile).expect(200);

      await updateMe(alice.accessToken, {
        name: 'Alice',
        dateOfBirth: '1990-05-17',
        gender: 'female',
      }).expect(200);
      await updateMe(alice.accessToken, { name: null, dateOfBirth: null, gender: null }).expect(
        200,
      );

      expect(await readProfile(bob.accessToken)).toEqual(bobProfile);
    });

    it('updates only the user the access token belongs to, whatever the body says', async () => {
      const alice = await registerUser();
      const bob = await registerUser();

      await updateMe(alice.accessToken, { id: bob.id, name: 'Mallory' }).expect(400);

      expect(await readProfile(bob.accessToken)).toEqual(EMPTY_PROFILE);
    });
  });
});
