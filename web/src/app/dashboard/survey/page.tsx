import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSessionFromCookies } from "@/lib/auth/session";
import SurveyForm from "./SurveyForm";

export default async function SurveyPage() {
  try {
    const cookieStore = await cookies();
    await validateSessionFromCookies(cookieStore);
  } catch {
    redirect("/login?type=user");
  }

  return <SurveyForm />;
}
