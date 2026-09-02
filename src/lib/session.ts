import { cookies } from "next/headers";
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

export async function setSessionUser(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, userId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
