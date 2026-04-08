import { GET } from '@/app/api/kilo/photo/route';
import { POST } from '@/app/api/kilo/route';
import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { hashToken } from '@/lib/auth/token';
import { createTestUser, createMockRequest, createMockGetRequest } from '../../helpers';
import { randomUUID } from 'crypto';
import { writeFile, mkdir, rm } from 'fs/promises';
import path from 'path';

const testUser = createTestUser();
const otherUser = createTestUser();

// Test photo file setup
const TEST_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'kilo', 'test-photo-user');
const TEST_PHOTO_FILENAME = 'test-photo.jpg';
const TEST_PHOTO_PATH = `uploads/kilo/test-photo-user/${TEST_PHOTO_FILENAME}`;

// Minimal valid JPEG bytes (1x1 pixel)
const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=',
  'base64'
);

describe('Photo API Tests', () => {
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

    // Create test photo file on disk
    await mkdir(TEST_UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(TEST_UPLOADS_DIR, TEST_PHOTO_FILENAME), JPEG_BYTES);
  });

  afterAll(async () => {
    await db.deleteFrom('kilo').where('user_id', 'in', [testUser.id, otherUser.id]).execute();
    await db.deleteFrom('sessions').where('user_id', 'in', [testUser.id, otherUser.id]).execute();
    await db.deleteFrom('users').where('id', 'in', [testUser.id, otherUser.id]).execute();
    // Clean up test upload directory
    await rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
    await db.destroy();
  });

  beforeEach(async () => {
    await db.deleteFrom('kilo').where('user_id', 'in', [testUser.id, otherUser.id]).execute();
  });

  describe('GET /api/kilo/photo', () => {
    test('should return 401 without session', async () => {
      const request = createMockGetRequest('http://localhost:3000/api/kilo/photo?id=1');
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

    test('should return 400 when entry ID is missing', async () => {
      const request = createMockGetRequest('http://localhost:3000/api/kilo/photo');
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
      expect(data.error).toBe('Missing entry ID');
    });

    test('should return 400 for invalid entry ID', async () => {
      const request = createMockGetRequest('http://localhost:3000/api/kilo/photo?id=invalid');
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

    test('should return 400 for invalid question parameter', async () => {
      const request = createMockGetRequest('http://localhost:3000/api/kilo/photo?id=1&question=q5');
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
      expect(data.error).toBe('Invalid question parameter');
    });

    test('should return 404 for non-existent entry', async () => {
      const request = createMockGetRequest('http://localhost:3000/api/kilo/photo?id=999999');
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
      expect(data.error).toBe('Photo not found');
    });

    test('should return 404 for entry without photo', async () => {
      const createRequest = createMockRequest(
        { q1: 'Test answer without photo' },
        {},
        { session_token: testUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      const request = createMockGetRequest(`http://localhost:3000/api/kilo/photo?id=${entryId}`);
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
      expect(data.error).toBe('Photo not found');
    });

    test('should return 404 when accessing another users photo', async () => {
      // Create entry with photo for other user
      const createRequest = createMockRequest(
        { q1: 'Other user entry', q1_photo_path: TEST_PHOTO_PATH },
        {},
        { session_token: otherUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      // Try to access as testUser
      const request = createMockGetRequest(`http://localhost:3000/api/kilo/photo?id=${entryId}`);
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
      expect(data.error).toBe('Photo not found');
    });

    test('should return photo file with correct content type', async () => {
      // Create entry with q1_photo_path pointing to test file
      const createRequest = createMockRequest(
        { q1: 'Test with photo', q1_photo_path: TEST_PHOTO_PATH },
        {},
        { session_token: testUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      const request = createMockGetRequest(`http://localhost:3000/api/kilo/photo?id=${entryId}&question=q1`);
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/jpeg');
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=31536000, immutable');

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/kilo with photo updates', () => {
    test('should keep existing photo when keep_q1_photo is true', async () => {
      const createRequest = createMockRequest(
        { q1: 'Original answer', q1_photo_path: TEST_PHOTO_PATH },
        {},
        { session_token: testUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      expect(createData.entry.q1_photo_path).toBe(TEST_PHOTO_PATH);

      const { PUT } = await import('@/app/api/kilo/route');
      const updateRequest = createMockRequest(
        { id: entryId, q1: 'Updated answer', keep_q1_photo: true },
        {},
        { session_token: testUser.session_token }
      );

      const updateResponse = await PUT(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.entry.q1).toBe('Updated answer');
      expect(updateData.entry.q1_photo_path).toBe(TEST_PHOTO_PATH);
    });

    test('should clear photo when keep_q1_photo is not set and no new photo provided', async () => {
      const createRequest = createMockRequest(
        { q1: 'Original answer', q1_photo_path: TEST_PHOTO_PATH },
        {},
        { session_token: testUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      expect(createData.entry.q1_photo_path).toBe(TEST_PHOTO_PATH);

      const { PUT } = await import('@/app/api/kilo/route');
      const updateRequest = createMockRequest(
        { id: entryId, q1: 'Updated answer' },
        {},
        { session_token: testUser.session_token }
      );

      const updateResponse = await PUT(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.entry.q1).toBe('Updated answer');
      expect(updateData.entry.q1_photo_path).toBeNull();
    });

    test('should replace photo when new q1_photo_path is provided', async () => {
      const createRequest = createMockRequest(
        { q1: 'Original answer', q1_photo_path: TEST_PHOTO_PATH },
        {},
        { session_token: testUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      // Create a second test photo (PNG)
      const pngFilename = 'test-photo.png';
      const pngPath = `uploads/kilo/test-photo-user/${pngFilename}`;
      await writeFile(path.join(TEST_UPLOADS_DIR, pngFilename), JPEG_BYTES); // reuse bytes for simplicity

      const { PUT } = await import('@/app/api/kilo/route');
      const updateRequest = createMockRequest(
        { id: entryId, q1: 'Updated answer', q1_photo_path: pngPath },
        {},
        { session_token: testUser.session_token }
      );

      const updateResponse = await PUT(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.entry.q1_photo_path).toBe(pngPath);
    });
  });
});
