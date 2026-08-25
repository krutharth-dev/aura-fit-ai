import CoachClient from "./coach-client";
import { getAuraFitUser, signInPath, signOutPath } from "./auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAuraFitUser();
  return (
    <CoachClient
      user={user ? { displayName: user.displayName, email: user.email } : null}
      isAdmin={Boolean(user?.isAdmin)}
      signInPath={signInPath("/")}
      signOutPath={signOutPath("/")}
    />
  );
}
