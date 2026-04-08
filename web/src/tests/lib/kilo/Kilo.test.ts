import { POST, GET, PUT, DELETE } from '@/app/api/kilo/route';
import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { hashToken } from '@/lib/auth/token';
import { createTestUser, createMockRequest, createMockGetRequest } from '../../helpers';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';

// Create unique test users for this test file
const testUser = createTestUser();
const otherUser = createTestUser();
const incompleteUser = createTestUser();

describe('KILO API Tests', () => {
  beforeAll(async () => {
    // Create test users
    const passwordHash = await hashPassword(testUser.password);
    const tokenHash = hashToken(testUser.session_token);

    await db.insertInto('users').values({
      id: testUser.id,
      email: testUser.email,
      username: testUser.username,
      password_hash: passwordHash,
      system_role: testUser.system_role,
      created_at: new Date(),
    }).execute();

    await db.insertInto('sessions').values({
      id: randomUUID(),
      user_id: testUser.id,
      token_hash: tokenHash,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60),
    }).execute();

    // Create second user for authorization tests
    const otherPasswordHash = await hashPassword(otherUser.password);
    const otherTokenHash = hashToken(otherUser.session_token);

    await db.insertInto('users').values({
      id: otherUser.id,
      email: otherUser.email,
      username: otherUser.username,
      password_hash: otherPasswordHash,
      system_role: otherUser.system_role,
      created_at: new Date(),
    }).execute();

    await db.insertInto('sessions').values({
      id: randomUUID(),
      user_id: otherUser.id,
      token_hash: otherTokenHash,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60),
    }).execute();

    const incompletePasswordHash = await hashPassword(incompleteUser.password);
    const incompleteTokenHash = hashToken(incompleteUser.session_token);

    await db.insertInto('users').values({
      id: incompleteUser.id,
      email: incompleteUser.email,
      username: incompleteUser.username,
      password_hash: incompletePasswordHash,
      system_role: incompleteUser.system_role,
      created_at: new Date(),
    }).execute();

    await db.insertInto('sessions').values({
      id: randomUUID(),
      user_id: incompleteUser.id,
      token_hash: incompleteTokenHash,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60),
    }).execute();

    await db.insertInto('profiles').values([
      {
        id: randomUUID(),
        user_id: testUser.id,
        first_name: 'Test',
        last_name: 'User',
        dob: new Date('2000-01-01'),
        mauna: 'Mauna Kea',
        aina: 'Kailua',
        wai: 'Nuʻuanu',
        kula: 'Kamehameha',
        role: 'Student',
      },
      {
        id: randomUUID(),
        user_id: otherUser.id,
        first_name: 'Other',
        last_name: 'User',
        dob: new Date('2000-01-01'),
        mauna: 'Haleakala',
        aina: 'Hilo',
        wai: 'Wailuku',
        kula: 'UH',
        role: 'Teacher',
      },
    ]).execute();
  });

  afterAll(async () => {
    await db.deleteFrom('kilo').where('user_id', 'in', [testUser.id, otherUser.id, incompleteUser.id]).execute();
    await db.deleteFrom('profiles').where('user_id', 'in', [testUser.id, otherUser.id, incompleteUser.id]).execute();
    await db.deleteFrom('sessions').where('user_id', 'in', [testUser.id, otherUser.id, incompleteUser.id]).execute();
    await db.deleteFrom('users').where('id', 'in', [testUser.id, otherUser.id, incompleteUser.id]).execute();
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean up entries before each test
    await db.deleteFrom('kilo').where('user_id', 'in', [testUser.id, otherUser.id]).execute();
  });

  describe('POST /api/kilo', () => {
    test('should create entry with valid data', async () => {
      const request = createMockRequest(
        { q1: 'Test answer 1', q2: 'Test answer 2', q3: null, q4: 'Feeling grateful' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.entry).toBeDefined();
      expect(data.entry.q1).toBe('Test answer 1');
      expect(data.entry.q2).toBe('Test answer 2');
      expect(data.entry.q3).toBeNull();
      expect(data.entry.q4).toBe('Feeling grateful');
    });

    test('should reject entry without required q1', async () => {
      const request = createMockRequest(
        { q2: 'Only question 2' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.issues).toBeDefined();
    });

    test('should reject entry with empty q1', async () => {
      const request = createMockRequest(
        { q1: '', q2: 'Some answer' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    test('should reject entry without session', async () => {
      const request = createMockRequest(
        { q1: 'Test answer' },
        {},
        {} // No session cookie
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    test('should reject entry when profile is incomplete', async () => {
      const request = createMockRequest(
        { q1: 'Blocked answer' },
        {},
        { session_token: incompleteUser.session_token }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Complete your profile before creating a KILO entry.');
    });

    test('should accept q1_photo_path', async () => {
      const request = createMockRequest(
        { q1: 'Test answer', q1_photo_path: 'https://blob.example.com/kilo/testuser/1234567890.jpg' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.entry.q1_photo_path).toBe('https://blob.example.com/kilo/testuser/1234567890.jpg');
    });

    test('should create entry without photo when photo paths not provided', async () => {
      const request = createMockRequest(
        { q1: 'Test answer without photo' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.entry.q1_photo_path).toBeNull();
      expect(data.entry.q2_photo_path).toBeNull();
      expect(data.entry.q3_photo_path).toBeNull();
    });

    test('should store location when provided', async () => {
      const request = createMockRequest(
        { q1: 'Test answer', location: 'Honolulu, HI' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.entry.location).toBe('Honolulu, HI');
    });
  });

  describe('GET /api/kilo', () => {
    beforeEach(async () => {
      // Create test entries
      for (let i = 1; i <= 7; i++) {
        await db.insertInto('kilo').values({
          user_id: testUser.id,
          q1: `Entry ${i}`,
          q2: null,
          q3: null,
          q4: null,
        }).execute();
      }

      // Create entry for other user
      await db.insertInto('kilo').values({
        user_id: otherUser.id,
        q1: 'Other user entry',
        q2: null,
        q3: null,
        q4: null,
      }).execute();
    });

    test('should return paginated entries for authenticated user', async () => {
      const request = createMockGetRequest(
        'http://localhost:3000/api/kilo',
        {}
      );
      // Add session cookie
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toBeDefined();
      expect(data.entries.length).toBe(5); // Default PAGE_SIZE
      expect(data.total).toBe(7);
      expect(data.totalPages).toBe(2);
    });

    test('should return second page of entries', async () => {
      const request = createMockGetRequest(
        'http://localhost:3000/api/kilo?page=2',
        {}
      );
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries.length).toBe(2); // Remaining entries on page 2
      expect(data.page).toBe(2);
    });

    test('should not return other users entries', async () => {
      const request = createMockGetRequest(
        'http://localhost:3000/api/kilo?limit=50',
        {}
      );
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should only see testUser's entries, not otherUser's
      expect(data.entries.every((e: { q1: string }) => e.q1 !== 'Other user entry')).toBe(true);
      expect(data.total).toBe(7);
    });

    test('should return single entry by ID', async () => {
      // First get an entry ID
      const entry = await db.selectFrom('kilo')
        .select(['id'])
        .where('user_id', '=', testUser.id)
        .executeTakeFirst();

      const request = createMockGetRequest(
        `http://localhost:3000/api/kilo?id=${entry!.id}`,
        {}
      );
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entry).toBeDefined();
      expect(data.entry.id).toBe(entry!.id);
    });

    test('should return 404 for non-existent entry', async () => {
      const request = createMockGetRequest(
        'http://localhost:3000/api/kilo?id=999999',
        {}
      );
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Entry not found or not authorized');
    });

    test('should return 404 when accessing another users entry', async () => {
      // Get other user's entry ID
      const otherEntry = await db.selectFrom('kilo')
        .select(['id'])
        .where('user_id', '=', otherUser.id)
        .executeTakeFirst();

      const request = createMockGetRequest(
        `http://localhost:3000/api/kilo?id=${otherEntry!.id}`,
        {}
      );
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Entry not found or not authorized');
    });

    test('should return 400 for invalid entry ID', async () => {
      const request = createMockGetRequest(
        'http://localhost:3000/api/kilo?id=invalid',
        {}
      );
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid entry ID');
    });

    test('should enforce max limit of 50', async () => {
      const request = createMockGetRequest(
        'http://localhost:3000/api/kilo?limit=100',
        {}
      );
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // With 7 entries and max limit of 50, we should get all 7
      expect(data.entries.length).toBeLessThanOrEqual(50);
    });

    test('should return 401 without session', async () => {
      const request = createMockGetRequest(
        'http://localhost:3000/api/kilo',
        {}
      );
      Object.defineProperty(request, 'cookies', {
        value: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
        },
        writable: false,
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/kilo', () => {
    let updateTestEntryId: number;

    beforeEach(async () => {
      const entry = await db.insertInto('kilo').values({
        user_id: testUser.id,
        q1: 'Original answer',
        q2: 'Original q2',
        q3: null,
        q4: null,
      }).returning(['id']).executeTakeFirst();
      updateTestEntryId = entry!.id;
    });

    test('should update entry with valid data', async () => {
      const request = createMockRequest(
        { id: updateTestEntryId, q1: 'Updated answer', q2: 'Updated q2', q3: 'New q3', q4: 'New q4' },
        {},
        { session_token: testUser.session_token }
      );
      // Override method
      Object.defineProperty(request, 'method', { value: 'PUT' });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entry.q1).toBe('Updated answer');
      expect(data.entry.q2).toBe('Updated q2');
      expect(data.entry.q3).toBe('New q3');
      expect(data.entry.q4).toBe('New q4');
    });

    test('should return 404 when updating non-existent entry', async () => {
      const request = createMockRequest(
        { id: 999999, q1: 'Updated answer' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Entry not found or not authorized');
    });

    test('should return 404 when updating another users entry', async () => {
      // Create entry for other user
      const otherEntry = await db.insertInto('kilo').values({
        user_id: otherUser.id,
        q1: 'Other user entry',
        q2: null,
        q3: null,
        q4: null,
      }).returning(['id']).executeTakeFirst();

      const request = createMockRequest(
        { id: otherEntry!.id, q1: 'Trying to update' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Entry not found or not authorized');
    });

    test('should reject update without required q1', async () => {
      const request = createMockRequest(
        { id: updateTestEntryId, q2: 'Only q2' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    test('should reject update with invalid ID', async () => {
      const request = createMockRequest(
        { id: -1, q1: 'Test' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    test('should return 401 without session', async () => {
      const request = createMockRequest(
        { id: updateTestEntryId, q1: 'Test' },
        {},
        {}
      );

      const response = await PUT(request);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/kilo', () => {
    let deleteTestEntryId: number;

    beforeEach(async () => {
      const entry = await db.insertInto('kilo').values({
        user_id: testUser.id,
        q1: 'Entry to delete',
        q2: null,
        q3: null,
        q4: null,
      }).returning(['id']).executeTakeFirst();
      deleteTestEntryId = entry!.id;
    });

    test('should delete entry successfully', async () => {
      const url = 'http://localhost:3000/api/kilo';
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: deleteTestEntryId }),
      });
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify entry is deleted
      const deletedEntry = await db.selectFrom('kilo')
        .selectAll()
        .where('id', '=', deleteTestEntryId)
        .executeTakeFirst();
      expect(deletedEntry).toBeUndefined();
    });

    test('should return 404 for non-existent entry', async () => {
      const url = 'http://localhost:3000/api/kilo';
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 999999 }),
      });
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Entry not found or not authorized');
    });

    test('should return 404 when deleting another users entry', async () => {
      // Create entry for other user
      const otherEntry = await db.insertInto('kilo').values({
        user_id: otherUser.id,
        q1: 'Other user entry',
        q2: null,
        q3: null,
        q4: null,
      }).returning(['id']).executeTakeFirst();

      const url = 'http://localhost:3000/api/kilo';
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: otherEntry!.id }),
      });
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Entry not found or not authorized');

      // Verify entry still exists
      const stillExists = await db.selectFrom('kilo')
        .selectAll()
        .where('id', '=', otherEntry!.id)
        .executeTakeFirst();
      expect(stillExists).toBeDefined();
    });

    test('should reject delete with invalid ID', async () => {
      const url = 'http://localhost:3000/api/kilo';
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: -1 }),
      });
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    test('should return 401 without session', async () => {
      const url = 'http://localhost:3000/api/kilo';
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: deleteTestEntryId }),
      });
      Object.defineProperty(request, 'cookies', {
        value: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
        },
        writable: false,
      });

      const response = await DELETE(request);

      expect(response.status).toBe(401);
    });
  });
});
