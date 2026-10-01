import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  ownerId: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

interface CreateMeetingBody {
  title: string;
  date: string;
  participants: string[];
}

const PASSWORD = 'Str0ng-Passw0rd!';

// Every test registers its own users, so tests don't depend on each other or on a clean database.
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

const futureDate = (daysFromNow = 1) =>
  new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();

const sorted = (values: string[]) => [...values].sort();

/** A meeting as returned by the API; `participants` are user ids, compared regardless of order. */
const expectMeeting = (
  body: unknown,
  expected: CreateMeetingBody & { ownerId: string },
): Meeting => {
  expect(body).toEqual({
    id: expect.any(String) as unknown,
    title: expected.title,
    date: new Date(expected.date).toISOString(),
    ownerId: expected.ownerId,
    participants: expect.any(Array) as unknown,
    createdAt: expect.any(String) as unknown,
    updatedAt: expect.any(String) as unknown,
  });
  const meeting = body as Meeting;
  expect(sorted(meeting.participants)).toEqual(sorted(expected.participants));
  return meeting;
};

describe('Meetings (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => request(app.getHttpServer());

  const createMeeting = (body: object, accessToken?: string) => {
    const req = server().post('/meetings');
    return (accessToken ? req.auth(accessToken, { type: 'bearer' }) : req).send(body);
  };

  const listMeetings = (accessToken?: string) => {
    const req = server().get('/meetings');
    return accessToken ? req.auth(accessToken, { type: 'bearer' }) : req;
  };

  const getMeeting = (id: string, accessToken?: string) => {
    const req = server().get(`/meetings/${id}`);
    return accessToken ? req.auth(accessToken, { type: 'bearer' }) : req;
  };

  const registerUser = async (): Promise<TestUser> => {
    const email = uniqueEmail();
    const res = await server()
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);
    const { user, accessToken } = res.body as { user: { id: string }; accessToken: string };
    return { id: user.id, email, accessToken };
  };

  const meetingBody = (overrides: Partial<CreateMeetingBody> = {}): CreateMeetingBody => ({
    title: `Meeting ${randomUUID()}`,
    date: futureDate(),
    participants: [],
    ...overrides,
  });

  const createMeetingFor = async (owner: TestUser, overrides: Partial<CreateMeetingBody> = {}) => {
    const body = meetingBody(overrides);
    const res = await createMeeting(body, owner.accessToken).expect(201);
    return expectMeeting(res.body, { ...body, ownerId: owner.id });
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

  describe('POST /meetings', () => {
    it('creates a meeting owned by the current user and returns it', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const body = meetingBody({ participants: [participant.id] });

      const res = await createMeeting(body, owner.accessToken).expect(201);

      expectMeeting(res.body, { ...body, ownerId: owner.id });
    });

    it('accepts several participants', async () => {
      const owner = await registerUser();
      const participants = await Promise.all([registerUser(), registerUser(), registerUser()]);

      await createMeetingFor(owner, { participants: participants.map(({ id }) => id) });
    });

    it('accepts an empty participants list', async () => {
      const owner = await registerUser();

      await createMeetingFor(owner, { participants: [] });
    });

    it('stores the meeting so it can be fetched by id', async () => {
      const owner = await registerUser();
      const created = await createMeetingFor(owner);

      const res = await getMeeting(created.id, owner.accessToken).expect(200);

      expect(res.body).toEqual(created);
    });

    it('gives every meeting its own id', async () => {
      const owner = await registerUser();
      const body = meetingBody();

      const first = await createMeetingFor(owner, body);
      const second = await createMeetingFor(owner, body);

      expect(second.id).not.toBe(first.id);
    });

    it('returns 401 without an access token', async () => {
      await createMeeting(meetingBody()).expect(401);
    });

    it('returns 401 for an invalid access token', async () => {
      await createMeeting(meetingBody(), 'not-a-token').expect(401);
    });

    it('returns 401 when a refresh token is used as an access token', async () => {
      const res = await server()
        .post('/auth/register')
        .send({ email: uniqueEmail(), password: PASSWORD })
        .expect(201);
      const { refreshToken } = res.body as { refreshToken: string };

      await createMeeting(meetingBody(), refreshToken).expect(401);
    });

    it.each([
      ['title is missing', { date: futureDate(), participants: [] }],
      ['title is empty', { title: '', date: futureDate(), participants: [] }],
      ['title is not a string', { title: 42, date: futureDate(), participants: [] }],
      ['date is missing', { title: 'Standup', participants: [] }],
      ['date is not a valid date', { title: 'Standup', date: 'tomorrow', participants: [] }],
      ['date is not a string', { title: 'Standup', date: 42, participants: [] }],
      ['participants is missing', { title: 'Standup', date: futureDate() }],
      [
        'participants is not an array',
        { title: 'Standup', date: futureDate(), participants: 'someone' },
      ],
      [
        'a participant id is not a UUID',
        { title: 'Standup', date: futureDate(), participants: ['not-a-uuid'] },
      ],
      [
        'a participant id is not a string',
        { title: 'Standup', date: futureDate(), participants: [42] },
      ],
      [
        'an unknown field is sent',
        { title: 'Standup', date: futureDate(), participants: [], ownerId: randomUUID() },
      ],
    ])('returns 400 when %s', async (_case, body) => {
      const owner = await registerUser();

      await createMeeting(body, owner.accessToken).expect(400);
    });

    it('does not create a meeting when validation fails', async () => {
      const owner = await registerUser();

      await createMeeting(
        { title: '', date: futureDate(), participants: [] },
        owner.accessToken,
      ).expect(400);

      const res = await listMeetings(owner.accessToken).expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns 400 and creates nothing when a participant is not a registered user', async () => {
      const owner = await registerUser();
      const participant = await registerUser();

      await createMeeting(
        meetingBody({ participants: [participant.id, randomUUID()] }),
        owner.accessToken,
      ).expect(400);

      const ownerMeetings = await listMeetings(owner.accessToken).expect(200);
      expect(ownerMeetings.body).toEqual([]);
      const participantMeetings = await listMeetings(participant.accessToken).expect(200);
      expect(participantMeetings.body).toEqual([]);
    });
  });

  describe('GET /meetings', () => {
    it('returns an empty list for a user without meetings', async () => {
      const user = await registerUser();

      const res = await listMeetings(user.accessToken).expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns the meetings created by the current user', async () => {
      const owner = await registerUser();
      const first = await createMeetingFor(owner, { date: futureDate(1) });
      const second = await createMeetingFor(owner, { date: futureDate(2) });

      const res = await listMeetings(owner.accessToken).expect(200);

      expect(res.body).toEqual([first, second]);
    });

    it('returns the meetings the current user was invited to', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meeting = await createMeetingFor(owner, { participants: [participant.id] });

      const res = await listMeetings(participant.accessToken).expect(200);

      expect(res.body).toEqual([meeting]);
    });

    it('returns both own meetings and meetings the user was invited to', async () => {
      const user = await registerUser();
      const other = await registerUser();
      const own = await createMeetingFor(user, { date: futureDate(1) });
      const invited = await createMeetingFor(other, {
        date: futureDate(2),
        participants: [user.id],
      });

      const res = await listMeetings(user.accessToken).expect(200);

      expect(res.body).toEqual([own, invited]);
    });

    it('sorts meetings by date, earliest first', async () => {
      const owner = await registerUser();
      const later = await createMeetingFor(owner, { date: futureDate(3) });
      const earlier = await createMeetingFor(owner, { date: futureDate(1) });
      const middle = await createMeetingFor(owner, { date: futureDate(2) });

      const res = await listMeetings(owner.accessToken).expect(200);

      expect(res.body).toEqual([earlier, middle, later]);
    });

    it('does not return meetings of other users', async () => {
      const user = await registerUser();
      const stranger = await registerUser();
      const somebodyElse = await registerUser();
      await createMeetingFor(stranger, { participants: [somebodyElse.id] });

      const res = await listMeetings(user.accessToken).expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 401 without an access token', async () => {
      await listMeetings().expect(401);
    });

    it('returns 401 for an invalid access token', async () => {
      await listMeetings('not-a-token').expect(401);
    });
  });

  describe('GET /meetings/:id', () => {
    it('returns a meeting of the current user by id', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meeting = await createMeetingFor(owner, { participants: [participant.id] });

      const res = await getMeeting(meeting.id, owner.accessToken).expect(200);

      expect(res.body).toEqual(meeting);
    });

    it('returns the meeting to a participant', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meeting = await createMeetingFor(owner, { participants: [participant.id] });

      const res = await getMeeting(meeting.id, participant.accessToken).expect(200);

      expect(res.body).toEqual(meeting);
    });

    it('returns 404 when the meeting does not exist', async () => {
      const user = await registerUser();

      await getMeeting(randomUUID(), user.accessToken).expect(404);
    });

    it('returns 404 for a meeting of another user, without revealing that it exists', async () => {
      const owner = await registerUser();
      const stranger = await registerUser();
      const meeting = await createMeetingFor(owner);

      const foreign = await getMeeting(meeting.id, stranger.accessToken).expect(404);
      const missing = await getMeeting(randomUUID(), stranger.accessToken).expect(404);

      expect(foreign.body).toEqual(missing.body);
    });

    it('returns 400 when the id is not a UUID', async () => {
      const user = await registerUser();

      await getMeeting('not-a-uuid', user.accessToken).expect(400);
    });

    it('returns 401 without an access token', async () => {
      const owner = await registerUser();
      const meeting = await createMeetingFor(owner);

      await getMeeting(meeting.id).expect(401);
    });

    it('returns 401 for an invalid access token', async () => {
      await getMeeting(randomUUID(), 'not-a-token').expect(401);
    });
  });
});
