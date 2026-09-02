"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, setSessionUser, clearSession } from "@/lib/session";

export async function loginAs(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  if (!userId) return;
  await setSessionUser(userId);
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function nextCaseNumber() {
  return prisma.case.count().then((n) => "BUKO-" + (1001 + n));
}

export async function createCase(formData: FormData) {
  const user = await requireUser();

  const titel = String(formData.get("titel") || "").trim();
  const kund = String(formData.get("kund") || "").trim();
  const jobbnummer = String(formData.get("jobbnummer") || "").trim();
  const adress = String(formData.get("adress") || "").trim();
  const region = String(formData.get("region") || "") || null;
  const beskrivning = String(formData.get("beskrivning") || "").trim();
  const svarighetsgrad = String(formData.get("svarighetsgrad") || "MEDEL");
  const deadlineRaw = String(formData.get("deadline") || "");
  const tilldeladTAId = String(formData.get("tilldeladTA") || "") || null;

  if (!titel || !kund || !adress || !beskrivning) {
    throw new Error("Fyll i kund, titel, adress och beskrivning.");
  }

  const id = await nextCaseNumber();
  const status = tilldeladTAId ? "HOS_TA" : "NY";
  const now = new Date();

  await prisma.case.create({
    data: {
      id,
      titel,
      kund,
      jobbnummer: jobbnummer || null,
      adress,
      region,
      beskrivning,
      svarighetsgrad,
      deadline: deadlineRaw ? new Date(deadlineRaw) : null,
      status,
      skapadAvId: user.id,
      tilldeladTAId,
      historyEntries: {
        create: [
          { text: "Ärende skapat", userId: user.id, datum: now },
          ...(tilldeladTAId
            ? [{ text: "Tilldelat " + (await prisma.user.findUnique({ where: { id: tilldeladTAId } }))!.name, userId: user.id, datum: now }]
            : []),
        ],
      },
      statusLog: {
        create: tilldeladTAId
          ? [{ status: "NY", datum: now }, { status: "HOS_TA", datum: now }]
          : [{ status: "NY", datum: now }],
      },
    },
  });

  revalidatePath("/");
  redirect(`/arende/${id}`);
}

export async function addComment(caseId: string, formData: FormData) {
  const user = await requireUser();
  const text = String(formData.get("text") || "").trim();
  if (!text) return;

  await prisma.comment.create({
    data: { caseId, userId: user.id, text },
  });
  await prisma.case.update({ where: { id: caseId }, data: { uppdaterad: new Date() } });

  revalidatePath(`/arende/${caseId}`);
}

export async function assignTA(caseId: string, formData: FormData) {
  const user = await requireUser();
  const taId = String(formData.get("taId") || "");
  if (!taId) return;
  const ta = await prisma.user.findUnique({ where: { id: taId } });
  if (!ta) return;

  const now = new Date();
  await prisma.case.update({
    where: { id: caseId },
    data: {
      tilldeladTAId: taId,
      status: "HOS_TA",
      historyEntries: { create: { text: "Tilldelat " + ta.name, userId: user.id, datum: now } },
      statusLog: { create: { status: "HOS_TA", datum: now } },
    },
  });

  revalidatePath(`/arende/${caseId}`);
}

export async function transitionStatus(caseId: string, newStatus: string, historyText: string) {
  const user = await requireUser();
  const now = new Date();

  await prisma.case.update({
    where: { id: caseId },
    data: {
      status: newStatus,
      historyEntries: { create: { text: historyText, userId: user.id, datum: now } },
      statusLog: { create: { status: newStatus, datum: now } },
    },
  });

  revalidatePath(`/arende/${caseId}`);
}

export async function saveTillstand(caseId: string, formData: FormData) {
  const user = await requireUser();

  const startdatumRaw = String(formData.get("startdatum") || "");
  const slutdatumRaw = String(formData.get("slutdatum") || "");
  const kundKontaktNamn = String(formData.get("kundKontaktNamn") || "").trim();
  const kundKontaktEmail = String(formData.get("kundKontaktEmail") || "").trim();
  const paminnelseDagarInnan = parseInt(String(formData.get("paminnelseDagarInnan") || "14"), 10) || 14;

  if (!slutdatumRaw) throw new Error("Ange slutdatum för tillståndet.");

  await prisma.tillstand.upsert({
    where: { caseId },
    create: {
      caseId,
      startdatum: startdatumRaw ? new Date(startdatumRaw) : null,
      slutdatum: new Date(slutdatumRaw),
      kundKontaktNamn: kundKontaktNamn || null,
      kundKontaktEmail: kundKontaktEmail || null,
      paminnelseDagarInnan,
    },
    update: {
      startdatum: startdatumRaw ? new Date(startdatumRaw) : null,
      slutdatum: new Date(slutdatumRaw),
      kundKontaktNamn: kundKontaktNamn || null,
      kundKontaktEmail: kundKontaktEmail || null,
      paminnelseDagarInnan,
    },
  });

  await prisma.case.update({
    where: { id: caseId },
    data: {
      historyEntries: {
        create: { text: "Tillstånd registrerat: giltigt till " + new Date(slutdatumRaw).toLocaleDateString("sv-SE"), userId: user.id },
      },
    },
  });

  revalidatePath(`/arende/${caseId}`);
  revalidatePath("/tillstand");
}
