import { getAuthUser } from "@/lib/auth/session";
import { fetchAdminDashboardData } from "@/lib/data/admin";
import { fetchMemberDashboardData } from "@/lib/data/member";
import { fetchSysAdminDashboardData } from "@/lib/data/sysadmin";
import AdminDashboardClient from "@/components/dashboard/AdminDashboardClient";
import MemberDashboardClient from "@/components/dashboard/MemberDashboardClient";
import SysAdminDashboardClient from "@/components/dashboard/SysAdminDashboardClient";
import GuestDashboardClient from "@/components/dashboard/GuestDashboardClient";

export default async function DashboardPage() {
  // fetch cached user data
  const user = await getAuthUser();  

  // feed user data into client component dashboard renders
  if (user.system_role === "sysadmin") {
    const data = await fetchSysAdminDashboardData();
    return <SysAdminDashboardClient user={user} data={data} />;
  }

  if (user.role === "admin") {
    const data = await fetchAdminDashboardData(user.id);
    return <AdminDashboardClient user={user} data={data} />;
  }

  if (user.role === "member") {
    const data = await fetchMemberDashboardData(user.id);
    return <MemberDashboardClient user={user} data={data} />;
  }

  // Guest (no org role)
  return <GuestDashboardClient user={user} />;
}  