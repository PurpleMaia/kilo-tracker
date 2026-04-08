import { GET } from "@/app/api/audio/health/route";
import { POST } from "@/app/api/auth/login/route";
import { testUser, createAuthedRequest, createMockRequest } from "../helpers";
import { db } from "@/db/kysely/client";
import { hashPassword } from "@/lib/auth/password";

/**
 * Integration tests to test rate limit Speaches STT endpoints & General LLM endpoints
 *
 * These tests make real API calls to the Speaches service.
 * Ensure the Speaches server is running before executing these tests.
 *
 * Prerequisites:
 * - Speaches server running at MODEL_BASE_URL (default: http://localhost:8000)
 * - Valid MODEL_API_KEY in .env
 */

describe("LLM Rate Limiting", () => {
  let sessionToken: string;

  const createAuthedHealthRequest = (ip: string) =>
    createAuthedRequest("http://localhost/api/audio/health", sessionToken, {
      method: "GET",
      ip,
    });

   // Sign in as a test user
   beforeAll(async () => {
    const userPasswordHash = await hashPassword(testUser.password);

    await db
        .insertInto('users')
        .values({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
        password_hash: userPasswordHash,
        system_role: testUser.system_role,
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
    
    const request = createMockRequest({
        credentials: {
          identifier: testUser.email,
          password: testUser.password,
        },
      });

    const loginResponse = await POST(request);
    expect(loginResponse.status).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.token).toBeDefined();
    sessionToken = loginBody.token;
  });

  // Clean up test users
  afterAll(async () => {
    await db.deleteFrom('users').where('id', '=', testUser.id).execute();
  });
  
  it("should allow requests within the rate limit", async () => {    
    // Simulate making a llm request
    for (let i = 0; i < 5; i++) {
      const request = createAuthedHealthRequest("127.0.0.11");
      const response = await GET(request);
      expect(response.status).toBe(200);
    }
  });

  it("should block requests that exceed the rate limit", async () => {
    // Simulate making 25 requests in quick succession (exceeding the default limit of 20)
    let lastResponse: Response | null = null;
    for (let i = 0; i < 25; i++) {
      const request = createAuthedHealthRequest("127.0.0.12");
      lastResponse = await GET(request);
    }
    expect(lastResponse).not.toBeNull();
    expect(lastResponse!.status).toBe(429);
    const body = await lastResponse!.json();
    expect(body.error).toBe("Too many requests. Please try again later.");  
  });

  it("should return 500 for unexpected errors", async () => {
    const request = createAuthedHealthRequest("127.0.0.13");
    const response = await GET(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to connect to Speaches API");
  });
});
