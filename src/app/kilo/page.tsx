import { KiloPageClient } from "@/components/kilo/kilo-page-client";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function KiloPage({ searchParams }: PageProps) {
  // Check authentication
  try {
    await getAuthUser();
  } catch {
    redirect("/login");
  }

  const params = await searchParams;
  const editId = params.edit || null;

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-start py-10 gap-8">
      <h1 className="text-4xl font-bold">KILO Tracker</h1>

      <KiloPageClient editId={editId} />
    </div>
  );
}
