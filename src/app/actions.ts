"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import type { Region, Severity, CaseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setSessionUser, clearSession, requireUser } from "@/lib/session";

// Lokal filsystemslagring för utveckling. Byt ut mot Azure Blob Storage (eller
// motsvarande) innan skarp drift - den här katalogen finns bara på den här
// maskinen och skulle inte överleva en driftsättning på t.ex. Vercel/Azure
// App Service, där filsystemet inte är beständigt mellan omstarter.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_BYTES = 10 * 1024 * 1024;

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

function nextCaseNumber() {
  return prisma.case.count().then((n) => "BUKO-" + (1001 + n));
}

export async function createCase(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "PL" && user.role !== "ADMIN") throw new Error("Endast projektledare kan skapa ärenden.");

  const titel = String(formData.get("titel") || "").trim();
  const kund = String(formData.get("kund") || "").trim();
  const jobbnummer = String(formData.get("jobbnummer") || "").trim();
  const adress = String(formData.get("adress") || "").trim();
  const region = (String(formData.get("region") || "") || null) as Region | null;
  const beskrivning = String(formData.get("beskrivning") || "").trim();
  const svarighetsgrad = String(formData.get("svarighetsgrad") || "MEDEL") as Severity;
  const deadlineRaw = String(formData.get("deadline") || "");
  const tilldeladTAId = String(formData.get("tilldeladTA") || "") || null;
  const kartaRaw = String(formData.get("karta") || "");

  if (!titel || !kund || !adress || !beskrivning) {
    throw new Error("Fyll i kund, titel, adress och beskrivning.");
  }

  const id = await nextCaseNumber();
  const status: CaseStatus = tilldeladTAId ? "HOS_TA" : "NY";
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
      karta: kartaRaw || null,
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

  const [ta, current] = await Promise.all([
    prisma.user.findUnique({ where: { id: taId } }),
    prisma.case.findUnique({ where: { id: caseId } }),
  ]);
  if (!ta || !current) return;
  const isOwnerPL = user.id === current.skapadAvId || user.role === "ADMIN";
  if (!isOwnerPL) throw new Error("Du kan bara tilldela ärenden du äger.");

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

export async function transitionStatus(caseId: string, newStatus: CaseStatus, historyText: string) {
  const user = await requireUser();

  const current = await prisma.case.findUnique({ where: { id: caseId } });
  if (!current) return;
  const isOwnerPL = user.id === current.skapadAvId || user.role === "ADMIN";
  const isAssignedTA = user.id === current.tilldeladTAId || user.role === "ADMIN";

  const allowed =
    (current.status === "HOS_TA" && isAssignedTA) ||
    (["TA_KLAR", "TILLSTAND_SOKT", "TILLSTAND_AVSLAG", "TILLSTAND_BEVILJAT"].includes(current.status) && isOwnerPL);
  if (!allowed) throw new Error("Du har inte behörighet att göra den här ändringen.");

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

export async function uploadFiles(caseId: string, formData: FormData) {
  const user = await requireUser();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return;

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} är för stor (max 10 MB).`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  for (const file of files) {
    const ext = path.extname(file.name);
    const storedName = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

    await prisma.fileAttachment.create({
      data: {
        namn: file.name,
        storlek: file.size,
        typ: file.type || "application/octet-stream",
        url: `/uploads/${storedName}`,
        caseId,
        uppladdadAvId: user.id,
      },
    });
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      uppdaterad: new Date(),
      historyEntries: {
        create: files.map((f) => ({ text: "Laddade upp fil: " + f.name, userId: user.id })),
      },
    },
  });

  revalidatePath(`/arende/${caseId}`);
}

export async function removeFile(caseId: string, fileId: string) {
  await requireUser();
  const file = await prisma.fileAttachment.findUnique({ where: { id: fileId } });
  if (!file || file.caseId !== caseId) return;

  try {
    await unlink(path.join(UPLOAD_DIR, path.basename(file.url)));
  } catch {
    // already gone from disk - still remove the DB record
  }
  await prisma.fileAttachment.delete({ where: { id: fileId } });

  revalidatePath(`/arende/${caseId}`);
}
