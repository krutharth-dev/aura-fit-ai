import { redirect } from "next/navigation";
import AuthForm from "../auth-form";
import { getAuraFitUser } from "../auth";
import { safeReturnPath } from "../../lib/password-auth";

export const metadata = { title: "Create account · AURA FIT AI" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  if (await getAuraFitUser()) redirect(returnTo);
  return <AuthForm mode="signup" returnTo={returnTo} error={params.error} />;
}
