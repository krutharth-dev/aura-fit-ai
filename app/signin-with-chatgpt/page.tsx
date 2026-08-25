import { redirect } from "next/navigation";

export default async function LegacySignIn({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  redirect(`/signin?return_to=${encodeURIComponent(params.return_to ?? "/")}`);
}
