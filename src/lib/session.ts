import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

const COOKIE_NAME = "buko_uid";

// Enkel "simulerad inloggning" i väntan på riktig autentisering (Entra ID).
// Sparar bara ett användar-id i en cookie – ingen lösenordskontroll.
// Bytas ut mot en riktig session när Azure-uppgifterna finns på plats.
export async function getCurrentUser() {
  const store = await cookies();
  const uid = store.get(COOKIE_NAME)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

// For use in Server Component pages under (app): the layout already redirects
// to /login when there's no session, but Next.js can evaluate a page's own
// data fetching independently of its layout (e.g. during prefetching), so
// each page should defend itself too instead of asserting the user is non-null.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSessionUser(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, userId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
