import CoachClient from "./coach-client";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import { isAdminEmail } from "../lib/admin-access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <CoachClient
      user={user ? { displayName: user.displayName, email: user.email } : null}
      isAdmin={isAdminEmail(user?.email)}
      signInPath={chatGPTSignInPath("/")}
      signOutPath={chatGPTSignOutPath("/")}
    />
  );
}
