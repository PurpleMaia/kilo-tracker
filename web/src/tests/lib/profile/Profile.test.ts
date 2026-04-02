import { GET, PUT } from '@/app/api/profile/route';
import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { hashToken } from '@/lib/auth/token';
import { createTestUser, createMockRequest } from '../../helpers';
import { randomUUID } from 'crypto';

const testUser = createTestUser();

const validProfileBody = {
  first_name: 'Kaimana',
  last_name: 'Akana',
  dob: '1990-06-15',
  mauna: 'Mauna Kea',
  aina: 'Hawaiʻi',
  wai: 'Wailuku',
  kula: 'Kamehameha',
  role: 'student',
};

describe('Profile API Tests', () => {
  beforeAll(async () => {
    const passwordHash = await hashPassword(testUser.password);
    const tokenHash = hashToken(testUser.session_token);

    await db
      .insertInto('users')
      .values({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
        password_hash: passwordHash,
        system_role: testUser.system_role,
        created_at: new Date(),
      })
      .execute();

    await db
      .insertInto('sessions')
      .values({
        id: randomUUID(),
        user_id: testUser.id,
        token_hash: tokenHash,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 1000 * 60 * 60),
      })
      .execute();
  });

  afterAll(async () => {
    await db.deleteFrom('profiles').where('user_id', '=', testUser.id).execute();
    await db.deleteFrom('sessions').where('user_id', '=', testUser.id).execute();
    await db.deleteFrom('users').where('id', '=', testUser.id).execute();
    await db.destroy();
  });

  describe('GET /api/profile', () => {
    test('should return null profile when none exists', async () => {
      const request = createMockRequest({}, {}, { session_token: testUser.session_token });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeNull();
    });

    test('should return profile when one exists', async () => {
      await db
        .insertInto('profiles')
        .values({
          id: randomUUID(),
          user_id: testUser.id,
          first_name: validProfileBody.first_name,
          last_name: validProfileBody.last_name,
          dob: new Date(validProfileBody.dob),
          mauna: validProfileBody.mauna,
          aina: validProfileBody.aina,
          wai: validProfileBody.wai,
          kula: validProfileBody.kula,
          role: validProfileBody.role,
        })
        .execute();

      const request = createMockRequest({}, {}, { session_token: testUser.session_token });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeDefined();
      expect(data.profile.first_name).toBe(validProfileBody.first_name);
      expect(data.profile.last_name).toBe(validProfileBody.last_name);

      await db.deleteFrom('profiles').where('user_id', '=', testUser.id).execute();
    });

    test('should return 401 when no session cookie', async () => {
      const request = createMockRequest({}, {}, {});
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/profile', () => {
    test('should create a new profile when none exists', async () => {
      const request = createMockRequest(validProfileBody, {}, { session_token: testUser.session_token });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeDefined();
      expect(data.profile.first_name).toBe(validProfileBody.first_name);
      expect(data.profile.user_id).toBe(testUser.id);
    });

    test('should update an existing profile', async () => {
      const updated = { ...validProfileBody, first_name: 'Kalani' };
      const request = createMockRequest(updated, {}, { session_token: testUser.session_token });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.first_name).toBe('Kalani');
    });

    test('should return 400 on invalid input', async () => {
      const request = createMockRequest(
        { first_name: '', last_name: 'Akana' },
        {},
        { session_token: testUser.session_token }
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    test('should return 401 when no session cookie', async () => {
      const request = createMockRequest(validProfileBody, {}, {});
      const response = await PUT(request);

      expect(response.status).toBe(401);
    });
  });
});
