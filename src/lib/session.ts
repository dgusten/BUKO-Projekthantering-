import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { prisma } from "./prisma";

// Riktig inloggning via Supabase Auth (e-post/lösenord). Kopplas till vår
// egen User-tabell via e-postadressen, som redan är unik där.
export async function getCurrentUser() {
  const supabase = await createClient();
  // Not destructuring `data.claims` directly: getClaims() returns
  // `data: null` (not `data: { claims: null }`) when there's no session,
  // which would throw trying to destructure a property off null.
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  if (!email) return null;

  return prisma.user.findUnique({ where: { email } });
}

// För Server Component-sidor under (app): lagret redirectar redan till
// /login om ingen session finns, men Next.js kan utvärdera en sidas egen
// datahämtning oberoende av sitt lager, så varje sida skyddar sig ändå själv
// istället för att anta att användaren finns.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
