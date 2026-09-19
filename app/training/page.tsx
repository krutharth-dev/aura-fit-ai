import { getAuraFitUser, signInPath } from "../auth";
import TrainingClient from "./training-client";
export const dynamic = "force-dynamic";
export const metadata = { title: "Training journal | AURA FIT", robots: { index: false, follow: false } };
export default async function TrainingPage() {
  const user = await getAuraFitUser();
  return <TrainingClient signedIn={Boolean(user)} name={user?.displayName ?? "Athlete"} signInPath={signInPath("/training")} />;
}
