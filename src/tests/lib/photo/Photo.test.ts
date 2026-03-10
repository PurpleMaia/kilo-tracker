import { POST } from '@/app/api/photo/route';
import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { hashToken } from '@/lib/auth/token';
import { createTestUser } from '../../helpers';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';

const testUser = createTestUser();

// Helper to create FormData with a file
function createMockPhotoRequest(
  file: File | null,
  sessionToken?: string
): NextRequest {
  const formData = new FormData();
  if (file) {
    formData.append('photo', file);
  }

  const request = new NextRequest('http://localhost:3000/api/photo', {
    method: 'POST',
    body: formData,
  });

  if (sessionToken) {
    Object.defineProperty(request, 'cookies', {
      value: {
        get: (name: string) => name === 'session_token' ? { name, value: sessionToken } : undefined,
        getAll: () => [{ name: 'session_token', value: sessionToken }],
        has: (name: string) => name === 'session_token',
      },
      writable: false,
    });
  } else {
    Object.defineProperty(request, 'cookies', {
      value: {
        get: () => undefined,
        getAll: () => [],
        has: () => false,
      },
      writable: false,
    });
  }

  return request;
}

// Create a mock image file
function createMockImageFile(sizeInBytes: number, type: string = 'image/jpeg', name: string = 'test.jpg'): File {
  const buffer = new ArrayBuffer(sizeInBytes);
  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
}

describe('Photo API Tests', () => {
  beforeAll(async () => {
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
  });

  afterAll(async () => {
    await db.deleteFrom('sessions').where('user_id', '=', testUser.id).execute();
    await db.deleteFrom('users').where('id', '=', testUser.id).execute();
    await db.destroy();
  });

  describe('POST /api/photo', () => {
    test('should return 401 without session', async () => {
      const file = createMockImageFile(1024);
      const request = createMockPhotoRequest(file);

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    test('should return 400 when no file is provided', async () => {
      const request = createMockPhotoRequest(null, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No photo provided');
    });

    test('should return 400 when file is too large (>5MB)', async () => {
      // Create a file that's slightly over 5MB
      const file = createMockImageFile(5 * 1024 * 1024 + 1);
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File too large (max 5MB)');
    });

    test('should return 400 for non-image file types', async () => {
      // Create a non-image file
      const buffer = new ArrayBuffer(1024);
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const file = new File([blob], 'document.pdf', { type: 'application/pdf' });
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Only image files are allowed');
    });

    test('should return 400 for text file disguised as image', async () => {
      // Create a text file with image extension but wrong mime type
      const blob = new Blob(['This is text content'], { type: 'text/plain' });
      const file = new File([blob], 'fake.jpg', { type: 'text/plain' });
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Only image files are allowed');
    });

    test('should accept valid JPEG image', async () => {
      const file = createMockImageFile(1024, 'image/jpeg', 'test.jpg');
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.path).toBeDefined();
      expect(data.path).toMatch(/^\/uploads\/kilo\/[a-zA-Z0-9-]+\/\d+-[a-f0-9]{8}\.jpg$/);
    });

    test('should accept valid PNG image', async () => {
      const file = createMockImageFile(1024, 'image/png', 'test.png');
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.path).toBeDefined();
      expect(data.path).toMatch(/^\/uploads\/kilo\/[a-zA-Z0-9-]+\/\d+-[a-f0-9]{8}\.png$/);
    });

    test('should accept valid WebP image', async () => {
      const file = createMockImageFile(1024, 'image/webp', 'test.webp');
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.path).toBeDefined();
      expect(data.path).toMatch(/^\/uploads\/kilo\/[a-zA-Z0-9-]+\/\d+-[a-f0-9]{8}\.webp$/);
    });

    test('should accept valid GIF image', async () => {
      const file = createMockImageFile(1024, 'image/gif', 'test.gif');
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.path).toBeDefined();
      expect(data.path).toMatch(/^\/uploads\/kilo\/[a-zA-Z0-9-]+\/\d+-[a-f0-9]{8}\.gif$/);
    });

    test('should accept file at exactly 5MB limit', async () => {
      const file = createMockImageFile(5 * 1024 * 1024, 'image/jpeg', 'large.jpg');
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.path).toBeDefined();
    });

    test('should include user ID in upload path', async () => {
      const file = createMockImageFile(1024, 'image/jpeg', 'test.jpg');
      const request = createMockPhotoRequest(file, testUser.session_token);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.path).toContain(testUser.id);
    });

    test('should generate unique filenames with timestamp', async () => {
      const file1 = createMockImageFile(1024, 'image/jpeg', 'test.jpg');
      const file2 = createMockImageFile(1024, 'image/jpeg', 'test.jpg');

      const request1 = createMockPhotoRequest(file1, testUser.session_token);
      const request2 = createMockPhotoRequest(file2, testUser.session_token);

      const response1 = await POST(request1);
      const data1 = await response1.json();

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.path).not.toBe(data2.path);
    });
  });
});
