import { GET } from "@/app/api/health/route";

describe("API Health Check", () => {
  test("returns a 200 health response", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("api");
    expect(typeof data.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(data.timestamp))).toBe(false);
  });
});
