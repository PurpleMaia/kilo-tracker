import { db } from "@/db/kysely/client";

export type SysAdminDashboardData = {
  totalUsers: number;
  totaltenants: number;
  activeSessions: number;
};

/**
 * Retrieves system administrator dashboard metrics, including total users, organizations, and active sessions.
 * @returns A promise that resolves to a SysAdminDashboardData object containing aggregated counts.
 */
export async function fetchSysAdminDashboardData(): Promise<SysAdminDashboardData> {
  const [usersResult, tenantsResult, sessionsResult] = await Promise.all([
    db.selectFrom("users")
      .select(({ fn }) => fn.count<number>("id").as("count"))
      .executeTakeFirst(),
    db.selectFrom("tenants")
      .select(({ fn }) => fn.count<number>("id").as("count"))
      .executeTakeFirst(),
    db.selectFrom("sessions")
      .select(({ fn }) => fn.count<number>("id").as("count"))
      .where("expires_at", ">", new Date())
      .executeTakeFirst(),
  ]);

  return {
    totalUsers: Number(usersResult?.count ?? 0),
    totaltenants: Number(tenantsResult?.count ?? 0),
    activeSessions: Number(sessionsResult?.count ?? 0),
  };
}
