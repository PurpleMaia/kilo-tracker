import { POST } from '@/app/api/auth/register/route';
import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { createMockRequest, testOrg } from '../../helpers';
import { randomUUID } from 'crypto';
import { Errors } from '@/lib/errors';

/*
1. Test successful registration without organization:
   - Send valid registration data without organizationId
   - Expect 201 response with user data and session cookie

2. Test successful registration with organization:
   - Create a test organization
   - Send valid registration data with organizationId
   - Expect 201 response with user data, role assigned, and member record created

3. Test duplicate email:
   - Create a user with a specific email
   - Try to register with the same email
   - Expect 409 response with 'Email already taken' error

4. Test duplicate username:
   - Create a user with a specific username
   - Try to register with the same username
   - Expect 409 response with 'Username already taken' error

5. Test invalid organization:
   - Send registration data with non-existent organizationId
   - Expect 404 response with 'Associated organization not found' error

6. Test validation errors:
   - Send registration data with invalid email/username/password
   - Expect 400 response with validation errors
*/

// Test user data for registration tests
const registerTestUser = {
   email: 'register-test@example.com',
   username: 'registeruser',
   password: 'SecurePassword123!',
};

const existingUser = {
   id: randomUUID(),
   email: 'existing@example.com',
   username: 'existinguser',
   password: 'ExistingPassword123!',
};

describe('Registration Tests', () => {
   // Setup: Create test organization and existing user before tests
   beforeAll(async () => {
      // Clear any existing rate limit records to start fresh
      await db.deleteFrom('login_attempts')
         .where('identifier', '=', 'REGISTRATION')
         .execute();

      // Create test organization
      await db.insertInto('orgs').values({
         id: testOrg.id,
         name: testOrg.name,
         slug: testOrg.slug,
         created_at: new Date(),
      }).execute();

      // Create existing user for duplicate tests
      const passwordHash = await hashPassword(existingUser.password);

      await db.insertInto('users').values({
         id: existingUser.id,
         email: existingUser.email,
         username: existingUser.username,
         password_hash: passwordHash,
         system_role: 'user',
         created_at: new Date(),
      }).execute();
   });

   // Teardown: Clean up database after all tests
   afterAll(async () => {
      await db.deleteFrom('members').where('org_id', '=', testOrg.id).execute();
      await db.deleteFrom('sessions').execute();
      await db.deleteFrom('login_attempts').where('identifier', '=', 'REGISTRATION').execute();
      await db.deleteFrom('users').where('email', '=', registerTestUser.email).execute();
      await db.deleteFrom('users').where('id', '=', existingUser.id).execute();
      await db.deleteFrom('orgs').where('id', '=', testOrg.id).execute();

      await db.destroy();
   });

   // Clean up registered test users after each test to avoid conflicts
   afterEach(async () => {
      await db.deleteFrom('members').where('org_id', '=', testOrg.id).execute();
      await db.deleteFrom('sessions').execute();
      await db.deleteFrom('users').where('email', '=', registerTestUser.email).execute();
   });

   describe('Successful Registration', () => {
      // Use unique IPs for successful registration tests to avoid rate limiting
      test('should register user without organization', async () => {
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: registerTestUser.username,
               password: registerTestUser.password,
            },
            { 'x-forwarded-for': '10.0.2.1' }
         );

         const response = await POST(request);

         expect(response.status).toBe(201);
         const data = await response.json();
         
         expect(data.user).toBeDefined();
         expect(data.user.email).toBe(registerTestUser.email);
         expect(data.user.username).toBe(registerTestUser.username);
         expect(data.user.id).toBeDefined();
         expect(data.user.role).toBeNull(); // No organization = no role

         // Verify user was created in database
         const dbUser = await db
            .selectFrom('users')
            .selectAll()
            .where('email', '=', registerTestUser.email)
            .executeTakeFirst();

         expect(dbUser).toBeDefined();
         expect(dbUser?.email).toBe(registerTestUser.email);
         expect(dbUser?.username).toBe(registerTestUser.username);
         expect(dbUser?.system_role).toBe('user');
      });

      test('should register user with organization and create member record', async () => {
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: registerTestUser.username,
               password: registerTestUser.password,
               organizationId: testOrg.id,
            },
            { 'x-forwarded-for': '10.0.2.2' }
         );

         const response = await POST(request);

         expect(response.status).toBe(201);
         const data = await response.json();
         
         expect(data.user).toBeDefined();
         expect(data.user.email).toBe(registerTestUser.email);
         expect(data.user.username).toBe(registerTestUser.username);
         expect(data.user.role).toBe('member'); // Should have member role

         // Verify user was created in database
         const dbUser = await db
            .selectFrom('users')
            .selectAll()
            .where('email', '=', registerTestUser.email)
            .executeTakeFirst();

         expect(dbUser).toBeDefined();

         // Verify member record was created
         const memberRecord = await db
            .selectFrom('members')
            .selectAll()
            .where('user_id', '=', dbUser!.id)
            .where('org_id', '=', testOrg.id)
            .executeTakeFirst();

         expect(memberRecord).toBeDefined();
         expect(memberRecord?.user_role).toBe('member');
      });

      test('should create session cookie on successful registration', async () => {
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: registerTestUser.username,
               password: registerTestUser.password,
            },
            { 'x-forwarded-for': '10.0.2.3' }
         );

         const response = await POST(request);

         expect(response.status).toBe(201);

         // Verify session was created in database
         const dbUser = await db
            .selectFrom('users')
            .select('id')
            .where('email', '=', registerTestUser.email)
            .executeTakeFirst();

         const session = await db
            .selectFrom('sessions')
            .selectAll()
            .where('user_id', '=', dbUser!.id)
            .executeTakeFirst();

         expect(session).toBeDefined();
         expect(session?.token_hash).toBeDefined();
         expect(new Date(session!.expires_at).getTime()).toBeGreaterThan(Date.now());
      });
   });

   describe('Duplicate User Errors', () => {
      test('should return 409 if email already exists', async () => {
         const request = createMockRequest(
            {
               email: existingUser.email, // Use existing user's email
               username: 'newusername',
               password: 'NewPassword123!',
            },
            { 'x-forwarded-for': '10.0.3.1' }
         );

         const response = await POST(request);

         expect(response.status).toBe(409);
         const data = await response.json();
         expect(data.error).toBe('Email already taken');
      });

      test('should return 409 if username already exists', async () => {
         const request = createMockRequest(
            {
               email: 'newemail@example.com',
               username: existingUser.username, // Use existing user's username
               password: 'NewPassword123!',
            },
            { 'x-forwarded-for': '10.0.3.2' }
         );

         const response = await POST(request);

         expect(response.status).toBe(409);
         const data = await response.json();
         expect(data.error).toBe('Username already taken');
      });
   });

   describe('Organization Errors', () => {
      test('should return 404 if organization does not exist', async () => {
         const nonExistentOrgId = randomUUID();

         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: registerTestUser.username,
               password: registerTestUser.password,
               organizationId: nonExistentOrgId,
            },
            { 'x-forwarded-for': '10.0.4.1' }
         );

         const response = await POST(request);

         expect(response.status).toBe(404);
         const data = await response.json();
         expect(data.error).toBe('Associated organization not found');
      });
   });

   describe('Validation Errors', () => {
      // Use unique IPs for validation tests to avoid rate limiting from previous tests
      test('should return 400 for invalid email format', async () => {
         const request = createMockRequest(
            {
               email: 'not-an-email',
               username: registerTestUser.username,
               password: registerTestUser.password,
            },
            { 'x-forwarded-for': '10.0.1.1' }
         );

         const response = await POST(request);

         expect(response.status).toBe(400);
         const data = await response.json();
         expect(data.error).toBe('Invalid input');
         expect(data.issues).toBeDefined();
      });

      test('should return 400 for username too short', async () => {
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: 'ab', // Less than 3 characters
               password: registerTestUser.password,
            },
            { 'x-forwarded-for': '10.0.1.2' }
         );

         const response = await POST(request);

         expect(response.status).toBe(400);
         const data = await response.json();
         expect(data.error).toBe('Invalid input');
      });

      test('should return 400 for invalid username characters', async () => {
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: 'user@name!', // Invalid characters
               password: registerTestUser.password,
            },
            { 'x-forwarded-for': '10.0.1.3' }
         );

         const response = await POST(request);

         expect(response.status).toBe(400);
         const data = await response.json();
         expect(data.error).toBe('Invalid input');
      });

      test('should return 400 for password too short', async () => {
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: registerTestUser.username,
               password: 'short', // Less than 8 characters
            },
            { 'x-forwarded-for': '10.0.1.4' }
         );

         const response = await POST(request);

         expect(response.status).toBe(400);
         const data = await response.json();
         expect(data.error).toBe('Invalid input');
      });

      test('should return 400 for missing required fields', async () => {
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               // Missing username and password
            },
            { 'x-forwarded-for': '10.0.1.5' }
         );

         const response = await POST(request);

         expect(response.status).toBe(400);
         const data = await response.json();
         expect(data.error).toBe('Invalid input');
      });
   });

   describe('Rate Limiting', () => {
      const rateLimitTestIP = '192.168.1.100';

      // Clean up rate limit records after each test
      afterEach(async () => {
         await db.deleteFrom('login_attempts')
            .where('ip_address', '=', rateLimitTestIP)
            .where('identifier', '=', 'REGISTRATION')
            .execute();
      });

      test('should allow registration within rate limit', async () => {
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: registerTestUser.username,
               password: registerTestUser.password,
            },
            { 'x-forwarded-for': rateLimitTestIP }
         );

         const response = await POST(request);

         expect(response.status).toBe(201);
      });

      test('should block registration after exceeding rate limit', async () => {
         // Insert 5 registration attempts to simulate hitting the limit
         const now = new Date();
         for (let i = 0; i < 5; i++) {
            await db.insertInto('login_attempts').values({
               ip_address: rateLimitTestIP,
               user_agent: 'test-agent',
               identifier: 'REGISTRATION',
               successful: true,
               attempt_at: now,
            }).execute();
         }

         // Try to register - should be blocked
         const request = createMockRequest(
            {
               email: 'ratelimit@example.com',
               username: 'ratelimituser',
               password: 'SecurePassword123!',
            },
            { 'x-forwarded-for': rateLimitTestIP }
         );

         const response = await POST(request);

         expect(response.status).toBe(429);
         const data = await response.json();
         expect(data.error).toBe(Errors.TOO_MANY_REQUESTS.message);
      });

      test('should allow registration after rate limit window expires', async () => {
         // Insert 5 old registration attempts (outside the 1 hour window)
         const oldTime = new Date(Date.now() - 61 * 60 * 1000); // 61 minutes ago
         for (let i = 0; i < 5; i++) {
            await db.insertInto('login_attempts').values({
               ip_address: rateLimitTestIP,
               user_agent: 'test-agent',
               identifier: 'REGISTRATION',
               successful: true,
               attempt_at: oldTime,
            }).execute();
         }

         // Try to register - should succeed since old attempts are outside window
         const request = createMockRequest(
            {
               email: registerTestUser.email,
               username: registerTestUser.username,
               password: registerTestUser.password,
            },
            { 'x-forwarded-for': rateLimitTestIP }
         );

         const response = await POST(request);

         expect(response.status).toBe(201);
      });
   });
});
