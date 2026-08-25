export async function GET(request: Request) {
  const current = new URL(request.url);
  const target = new URL("/api/auth/signout", current);
  const returnTo = current.searchParams.get("return_to");
  if (returnTo) target.searchParams.set("return_to", returnTo);
  return Response.redirect(target, 303);
}
