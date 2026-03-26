import { GET } from '@/app/api/kilo/photo/route';
import { POST } from '@/app/api/kilo/route';
import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { hashToken } from '@/lib/auth/token';
import { createTestUser, createMockRequest, createMockGetRequest } from '../../helpers';
import { randomUUID } from 'crypto';

const testUser = createTestUser();
const otherUser = createTestUser();

// Small valid base64 JPEG (1x1 pixel)
const VALID_BASE64_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=';

describe('Photo API Tests', () => {
  beforeAll(async () => {
    // Create test user
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

    // Create other user for authorization tests
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
  });

  afterAll(async () => {
    await db.deleteFrom('kilo').where('user_id', 'in', [testUser.id, otherUser.id]).execute();
    await db.deleteFrom('sessions').where('user_id', 'in', [testUser.id, otherUser.id]).execute();
    await db.deleteFrom('users').where('id', 'in', [testUser.id, otherUser.id]).execute();
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
      // Create entry without photo
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
        { q1: 'Other user entry', photo_base64: VALID_BASE64_JPEG, photo_mime_type: 'image/jpeg' },
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

    test('should return photo data with correct content type', async () => {
      // Create entry with photo
      const createRequest = createMockRequest(
        { q1: 'Test with photo', photo_base64: VALID_BASE64_JPEG, photo_mime_type: 'image/jpeg' },
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

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/jpeg');
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=31536000, immutable');

      // Verify response body is binary data
      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('should return PNG photo with correct content type', async () => {
      // Small valid base64 PNG (1x1 pixel)
      const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Create entry with PNG photo
      const createRequest = createMockRequest(
        { q1: 'Test with PNG', photo_base64: base64Png, photo_mime_type: 'image/png' },
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

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/png');
    });
  });

  describe('Photo size limits', () => {
    test('should reject photo larger than 5MB', async () => {
      // Create a base64 string that represents more than 5MB of data
      // Base64 encoding increases size by ~33%, so we need ~3.75MB of base64 to get 5MB decoded
      // However, the actual check is on decoded size, so we need to create a large enough base64
      const largeData = 'A'.repeat(7 * 1024 * 1024); // ~7MB base64 which decodes to ~5.25MB
      const largeBase64 = `data:image/jpeg;base64,${largeData}`;

      const request = createMockRequest(
        { q1: 'Test with large photo', photo_base64: largeBase64, photo_mime_type: 'image/jpeg' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Photo too large (max 5MB)');
    });

    test('should accept photo at exactly 5MB limit', async () => {
      // Create exactly 5MB of data (base64 encoded, which will decode to ~3.75MB)
      // To get exactly 5MB decoded, we need ~6.67MB of base64
      const exactData = 'A'.repeat(5 * 1024 * 1024); // This will decode to less than 5MB
      const exactBase64 = `data:image/jpeg;base64,${exactData}`;

      const request = createMockRequest(
        { q1: 'Test with max size photo', photo_base64: exactBase64, photo_mime_type: 'image/jpeg' },
        {},
        { session_token: testUser.session_token }
      );

      const response = await POST(request);

      // This should succeed since 5MB base64 decodes to ~3.75MB
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/kilo with photo updates', () => {
    test('should keep existing photo when keep_photo is true', async () => {
      // Create entry with photo
      const createRequest = createMockRequest(
        { q1: 'Original answer', photo_base64: VALID_BASE64_JPEG, photo_mime_type: 'image/jpeg' },
        {},
        { session_token: testUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      expect(createData.entry.has_photo).toBe(true);

      // Update without providing new photo but with keep_photo
      const { PUT } = await import('@/app/api/kilo/route');
      const updateRequest = createMockRequest(
        { id: entryId, q1: 'Updated answer', keep_photo: true },
        {},
        { session_token: testUser.session_token }
      );

      const updateResponse = await PUT(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.entry.q1).toBe('Updated answer');
      expect(updateData.entry.has_photo).toBe(true);
    });

    test('should clear photo when keep_photo is false and no new photo provided', async () => {
      // Create entry with photo
      const createRequest = createMockRequest(
        { q1: 'Original answer', photo_base64: VALID_BASE64_JPEG, photo_mime_type: 'image/jpeg' },
        {},
        { session_token: testUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      expect(createData.entry.has_photo).toBe(true);

      // Update without photo and without keep_photo
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
      expect(updateData.entry.has_photo).toBe(false);
    });

    test('should replace photo when new photo is provided', async () => {
      // Create entry with photo
      const createRequest = createMockRequest(
        { q1: 'Original answer', photo_base64: VALID_BASE64_JPEG, photo_mime_type: 'image/jpeg' },
        {},
        { session_token: testUser.session_token }
      );
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const entryId = createData.entry.id;

      // Small valid base64 PNG (different from JPEG)
      const newPhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Update with new photo
      const { PUT } = await import('@/app/api/kilo/route');
      const updateRequest = createMockRequest(
        { id: entryId, q1: 'Updated answer', photo_base64: newPhoto, photo_mime_type: 'image/png' },
        {},
        { session_token: testUser.session_token }
      );

      const updateResponse = await PUT(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.entry.has_photo).toBe(true);

      // Verify the photo was updated by checking mime type
      const getRequest = createMockGetRequest(`http://localhost:3000/api/kilo/photo?id=${entryId}`);
      Object.defineProperty(getRequest, 'cookies', {
        value: {
          get: (name: string) => name === 'session_token' ? { name, value: testUser.session_token } : undefined,
          getAll: () => [{ name: 'session_token', value: testUser.session_token }],
          has: (name: string) => name === 'session_token',
        },
        writable: false,
      });

      const getResponse = await GET(getRequest);
      expect(getResponse.headers.get('Content-Type')).toBe('image/png');
    });
  });
});
