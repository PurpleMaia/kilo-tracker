import { GET } from '@/app/api/auth/session/route';
import { db } from '@/db/kysely/client';
import { Errors } from '@/lib/errors';
import { hashPassword } from '@/lib/auth/password';
import { testUser, createMockRequest, testOrg } from '../../helpers';
import { randomUUID } from 'crypto';
import { hashToken } from '@/lib/auth/token';

/*
1. Test valid session for users with no org role & with org role:
   - Create a test user and session in the database.
   - Mock a NextRequest with the session cookie.
   - Call the GET function and expect a 200 response with user data.

2. Test missing session cookie:
   - Mock a NextRequest without a session cookie.
   - Call the GET function and expect a 401 response with NO_SESSION error.

3. Test invalid session cookie:
   - Mock a NextRequest with an invalid session cookie.
   - Call the GET function and expect a 401 response with INVALID_SESSION error.

4. Test expired session:
   - Create a test user and an expired session in the database.
   - Mock a NextRequest with the expired session cookie.
   - Call the GET function and expect a 401 response with EXPIRED_SESSION error.
*/

describe('Session Validation Tests', () => {
   // Setup: Create test user and session before tests
   beforeAll(async () => {
        const userPasswordHash = await hashPassword(testUser.password); 
        const userTokenHash = hashToken(testUser.session_token); 

        // Create test user
        await db.insertInto('users').values({
            id: testUser.id,
            email: testUser.email,
            username: testUser.username,
            password_hash: userPasswordHash,
            system_role: testUser.system_role,
            created_at: new Date(),
        }).execute();

        // Create test session
        await db.insertInto('sessions').values({
            id: randomUUID(),
            user_id: testUser.id,
            token_hash: userTokenHash,
            created_at: new Date(),
            expires_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
        }).execute();

        // Create test organization
        await db.insertInto('orgs').values({
            id: testOrg.id,
            name: testOrg.name,
            slug: testOrg.slug,
            created_at: new Date(),
        }).execute();
   });

   // Teardown: Clean up database after tests
   afterAll(async () => {
        await db.deleteFrom('sessions').where('user_id', '=', testUser.id).execute();
        await db.deleteFrom('users').where('id', '=', testUser.id).execute();
        await db.deleteFrom('orgs').where('id', '=', testOrg.id).execute();

        await db.destroy();
   });

   describe('Valid Session', () => {
      test('should validate active session and return user data with no role', async () => {
         const request = createMockRequest({}, {}, {
            'session_token': testUser.session_token,
         });

         const response = await GET(request);

         expect(response.status).toBe(200);
         const data = await response.json();        
         console.log('Response data:', data.user); 
         expect(data.user).toBeDefined();
         expect(data.user.id).toBe(testUser.id);
         expect(data.user.email).toBe(testUser.email);
         expect(data.user.username).toBe(testUser.username);
         expect(data.user.role).toBeNull(); // test user has no specific role assigned
      })

      test('should validate active session and return user data with role', async () => {
         // Assign a role to the test user
         await db.insertInto('members').values({
            id: randomUUID(),
            user_id: testUser.id,
            org_id: testOrg.id,
            user_role: 'member' as const,
         }).execute();

         const request = createMockRequest({}, {}, {
            'session_token': testUser.session_token,
         });

         const response = await GET(request);

         expect(response.status).toBe(200);
         const data = await response.json();         
         expect(data.user).toBeDefined();
         expect(data.user.id).toBe(testUser.id);
         expect(data.user.email).toBe(testUser.email);
         expect(data.user.username).toBe(testUser.username);
         expect(data.user.role).toBe('member') // test user has member role assigned

         // Clean up role assignment
         await db.deleteFrom('members').where('user_id', '=', testUser.id).execute();
      })
   })

   describe('Invalid Session', () => {
      test('should return 401 if session cookie is missing', async () => {
         const request = createMockRequest({}, {}, {}); // No cookies

         const response = await GET(request);

         expect(response.status).toBe(401);
         const data = await response.json();
         expect(data.error).toBe(Errors.NO_SESSION.message);
      })

      test('should return 401 if session cookie is invalid', async () => {
         const request = createMockRequest({}, {}, {
            'session_token': 'invalid-token',
         });

         const response = await GET(request);

         expect(response.status).toBe(401);
         const data = await response.json();
         expect(data.error).toBe(Errors.NO_SESSION.message);
      })

      test('should return 401 if session is expired', async () => {
         // Create an expired session for the test user
         await db.insertInto('sessions').values({
            id: randomUUID(),
            user_id: testUser.id,
            token_hash: hashToken('expired-session-token'),
            created_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            expires_at: new Date(Date.now() - 1000 * 60 * 30), // Expired 30 minutes ago
         }).execute();

         const request = createMockRequest({}, {}, {
            'session_token': 'expired-session-token',
         });

         const response = await GET(request);

         expect(response.status).toBe(401);
         const data = await response.json();
         expect(data.error).toBe(Errors.NO_SESSION.message); // validateSession does not differentiate expired vs invalid, both return NO_SESSION
      })
   })

   describe('Session Validation Caching', () => {
      test('should return consistent user data on multiple validations', async () => {
         // First request
         const request1 = createMockRequest({}, {}, {
            'session_token': testUser.session_token,
         });
         const response1 = await GET(request1);
         expect(response1.status).toBe(200);
         const data1 = await response1.json();

         // Second request with same token
         const request2 = createMockRequest({}, {}, {
            'session_token': testUser.session_token,
         });
         const response2 = await GET(request2);
         expect(response2.status).toBe(200);
         const data2 = await response2.json();

         // Both should return the same user data
         expect(data1.user.id).toBe(data2.user.id);
         expect(data1.user.email).toBe(data2.user.email);
         expect(data1.user.username).toBe(data2.user.username);
      })

      test('should correctly validate different session tokens', async () => {
         // Create a second user and session with unique identifiers
         const uniqueSuffix = randomUUID().slice(0, 8);
         const secondUser = {
            id: randomUUID(),
            email: `seconduser-${uniqueSuffix}@example.com`,
            username: `seconduser${uniqueSuffix}`,
            password: 'SecurePassword123!',
            session_token: `second-valid-token-${uniqueSuffix}`,
         };

         const passwordHash = await hashPassword(secondUser.password);
         const tokenHash = hashToken(secondUser.session_token);

         await db.insertInto('users').values({
            id: secondUser.id,
            email: secondUser.email,
            username: secondUser.username,
            password_hash: passwordHash,
            system_role: 'user',
            created_at: new Date(),
         }).execute();

         await db.insertInto('sessions').values({
            id: randomUUID(),
            user_id: secondUser.id,
            token_hash: tokenHash,
            created_at: new Date(),
            expires_at: new Date(Date.now() + 1000 * 60 * 60),
         }).execute();

         // Validate first user's session
         const request1 = createMockRequest({}, {}, {
            'session_token': testUser.session_token,
         });
         const response1 = await GET(request1);
         const data1 = await response1.json();

         // Validate second user's session
         const request2 = createMockRequest({}, {}, {
            'session_token': secondUser.session_token,
         });
         const response2 = await GET(request2);
         const data2 = await response2.json();

         // Should return different user data
         expect(data1.user.id).toBe(testUser.id);
         expect(data2.user.id).toBe(secondUser.id);
         expect(data1.user.email).not.toBe(data2.user.email);

         // Clean up second user
         await db.deleteFrom('sessions').where('user_id', '=', secondUser.id).execute();
         await db.deleteFrom('users').where('id', '=', secondUser.id).execute();
      })
   })
});