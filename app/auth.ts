import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "../lib/password-auth";

export type AuraFitUser = {
  displayName: string;
  email: string;
  isAdmin: boolean;
};

const EMAIL_HEADER = "x-aurafit-user-email";
const NAME_HEADER = "x-aurafit-user-name";
const NAME_ENCODING_HEADER = "x-aurafit-user-name-encoding";

export async function getAuraFitUser(): Promise<AuraFitUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(EMAIL_HEADER);
  if (!email) return null;
  const encodedName = requestHeaders.get(NAME_HEADER);
  let displayName = email;
  if (encodedName && requestHeaders.get(NAME_ENCODING_HEADER) === "percent-encoded-utf-8") {
    try { displayName = decodeURIComponent(encodedName); } catch { /* Keep the email fallback. */ }
  }
  return {
    displayName,
    email,
    isAdmin: requestHeaders.get("x-aurafit-user-admin") === "1",
  };
}

export async function requireAuraFitUser(returnTo: string): Promise<AuraFitUser> {
  const user = await getAuraFitUser();
  if (user) return user;
  redirect(signInPath(returnTo));
}

export function signInPath(returnTo = "/") {
  return `/signin?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function signOutPath(returnTo = "/") {
  return `/api/auth/signout?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}
