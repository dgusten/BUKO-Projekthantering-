"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import path from "path";
import type { Region, Severity, CaseStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createClient, createAdminSupabaseClient, FILES_BUCKET } from "@/lib/supabase/server";
import { sendMail, escapeHtml } from "@/lib/resend";
import { tillstandStatus } from "@/lib/tillstand";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect("/login?error=1");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=1");

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0], parts[0]?.[1]];
  return letters.filter(Boolean).join("").toUpperCase();
}

export async function createUser(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "ADMIN") throw new Error("Endast admin kan skapa användare.");

  const name = String(formData.get("name") || "").trim();
  // Supabase Auth normaliserar e-post till gemener internt (JWT-claimen vid
  // inloggning kommer alltid vara lowercase) - matchar vi inte det här slutar
  // session.ts:getCurrentUser() hitta rätt User-rad för konton skapade med
  // versaler i e-postadressen.
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "");
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) throw new Error("Fyll i namn, e-post och lösenord.");
  if (role !== "ADMIN" && role !== "PL" && role !== "TA") throw new Error("Ogiltig roll.");
  if (password.length < 8) throw new Error("Lösenordet måste vara minst 8 tecken.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Det finns redan en användare med den e-postadressen.");

  const supabaseAdmin = createAdminSupabaseClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`Kunde inte skapa inloggningskontot: ${error.message}`);

  await prisma.user.create({
    data: { name, email, role: role as Role, initials: initialsFrom(name) },
  });

  try {
    await sendMail(
      email,
      "Ditt konto i BUKO Sverige – Ärendehantering",
      `<p>Hej ${escapeHtml(name)},</p>` +
        `<p>Du har fått ett konto i BUKO Sveriges ärendehanteringssystem.</p>` +
        `<p>E-post: ${escapeHtml(email)}<br/>Tillfälligt lösenord: <strong>${escapeHtml(password)}</strong></p>` +
        `<p><a href="${APP_URL}/login">Logga in här</a> och byt gärna lösenord vid tillfälle.</p>`
    );
  } catch (e) {
    console.error("Kunde inte skicka välkomstmejl:", e);
  }

  revalidatePath("/anvandare");
}

export async function deleteUser(userId: string) {
  const admin = await requireUser();
  if (admin.role !== "ADMIN") throw new Error("Endast admin kan ta bort användare.");
  if (admin.id === userId) throw new Error("Du kan inte ta bort ditt eget konto.");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  const [created, assigned] = await Promise.all([
    prisma.case.count({ where: { skapadAvId: userId } }),
    prisma.case.count({ where: { tilldeladTAId: userId } }),
  ]);
  if (created > 0 || assigned > 0) {
    throw new Error(
      `${target.name} har ${created + assigned} ärende(n) kopplade till sig och kan inte tas bort. Flytta över ärendena till någon annan först.`
    );
  }

  const supabaseAdmin = createAdminSupabaseClient();
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw new Error(`Kunde inte slå upp inloggningskontot: ${listError.message}`);
  const authUser = list.users.find((u) => u.email === target.email);
  if (authUser) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    if (error) throw new Error(`Kunde inte ta bort inloggningskontot: ${error.message}`);
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/anvandare");
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
  const kopieradFranId = String(formData.get("kopieradFran") || "") || null;

  if (!titel || !kund || !adress || !beskrivning) {
    throw new Error("Fyll i kund, titel, adress och beskrivning.");
  }

  const kopieradFran = kopieradFranId ? await prisma.case.findUnique({ where: { id: kopieradFranId } }) : null;

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

  if (kopieradFran) {
    await prisma.$transaction([
      prisma.caseLink.create({ data: { caseId: id, linkedId: kopieradFran.id } }),
      prisma.caseLink.create({ data: { caseId: kopieradFran.id, linkedId: id } }),
    ]);
  }

  revalidatePath("/");
  redirect(`/arende/${id}`);
}

export async function addComment(caseId: string, formData: FormData) {
  const user = await requireUser();
  const text = String(formData.get("text") || "").trim();
  if (!text) return;

  const kase = await prisma.case.findUnique({
    where: { id: caseId },
    include: { skapadAv: true, tilldeladTA: true },
  });
  if (!kase) return;

  await prisma.comment.create({
    data: { caseId, userId: user.id, text },
  });
  await prisma.case.update({ where: { id: caseId }, data: { uppdaterad: new Date() } });

  revalidatePath(`/arende/${caseId}`);

  const recipients = [kase.skapadAv, kase.tilldeladTA].filter(
    (u): u is NonNullable<typeof u> => !!u && u.id !== user.id && !!u.email
  );
  if (recipients.length) {
    try {
      await sendMail(
        recipients.map((r) => r.email!),
        `Ny kommentar på ${caseId} – ${kase.titel}`,
        `<p><strong>${escapeHtml(user.name)}</strong> skrev en kommentar på ärende ` +
          `<strong>${caseId} – ${escapeHtml(kase.titel)}</strong>:</p>` +
          `<p style="white-space:pre-wrap">${escapeHtml(text)}</p>` +
          `<p><a href="${APP_URL}/arende/${caseId}">Öppna ärendet</a></p>`
      );
    } catch (e) {
      console.error("Kunde inte skicka kommentarsmejl:", e);
    }
  }
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
  const isUnclaimed = !current.tilldeladTAId;
  const canTaAct = user.role === "TA" && (isUnclaimed || user.id === current.tilldeladTAId);
  if (!isOwnerPL && !canTaAct) {
    throw new Error("Du kan bara tilldela ärenden du äger, eller ta över ärenden som inte är tilldelade eller redan är dina.");
  }
  if (current.status !== "NY" && current.status !== "HOS_TA") {
    throw new Error("Kan inte tilldela TA-plansritare i det här skedet av ärendet.");
  }

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

export async function transitionStatus(caseId: string, newStatus: CaseStatus, historyText: string, formData: FormData) {
  const user = await requireUser();

  const current = await prisma.case.findUnique({ where: { id: caseId } });
  if (!current) return;
  const isOwnerPL = user.id === current.skapadAvId || user.role === "ADMIN";
  const isAssignedTA = user.id === current.tilldeladTAId || user.role === "ADMIN";

  const allowed =
    (current.status === "HOS_TA" && isAssignedTA) ||
    (["TA_KLAR", "TILLSTAND_SOKT", "TILLSTAND_AVSLAG", "TILLSTAND_BEVILJAT"].includes(current.status) && isOwnerPL);
  if (!allowed) throw new Error("Du har inte behörighet att göra den här ändringen.");

  if (newStatus === "TILLSTAND_BEVILJAT" && formData.get("fakturerat") !== "on") {
    throw new Error("Bekräfta att kunden är fakturerad innan tillståndet markeras som beviljat.");
  }

  const now = new Date();

  await prisma.case.update({
    where: { id: caseId },
    data: {
      status: newStatus,
      ...(newStatus === "TILLSTAND_BEVILJAT" ? { fakturerat: true } : {}),
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

export async function sendTillstandReminder(caseId: string) {
  const user = await requireUser();

  const kase = await prisma.case.findUnique({
    where: { id: caseId },
    include: { skapadAv: true, tillstand: true },
  });
  if (!kase || !kase.tillstand) return;

  const t = kase.tillstand;
  const slutdatumLabel = new Date(t.slutdatum).toLocaleDateString("sv-SE");
  const status = tillstandStatus(t);

  const recipients = [kase.skapadAv.email, t.kundKontaktEmail].filter((e): e is string => !!e);
  if (!recipients.length) throw new Error("Ingen mottagare har en registrerad e-postadress.");

  await sendMail(
    recipients,
    `Påminnelse: Tillstånd för ${caseId} – ${kase.titel} löper ut ${slutdatumLabel}`,
    `<p>Detta är en påminnelse om att tillståndet för ärende <strong>${caseId} – ${escapeHtml(kase.titel)}</strong> ` +
      `på ${escapeHtml(kase.adress)} löper ut <strong>${slutdatumLabel}</strong> (${status.daysLeft} dagar kvar).</p>` +
      `<p>Kund: ${escapeHtml(kase.kund)}<br/>Kontaktperson hos kund: ${escapeHtml(t.kundKontaktNamn || "-")}</p>` +
      `<p>Se över om förlängning eller vidare åtgärd behövs.</p>` +
      `<p><a href="${APP_URL}/arende/${caseId}">Öppna ärendet</a></p>`
  );

  await prisma.case.update({
    where: { id: caseId },
    data: {
      historyEntries: {
        create: { text: `Påminnelse om tillstånd skickad till ${recipients.join(", ")}`, userId: user.id },
      },
    },
  });

  revalidatePath("/tillstand");
  revalidatePath(`/arende/${caseId}`);
}

export async function uploadFiles(caseId: string, formData: FormData) {
  const user = await requireUser();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return;

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} är för stor (max 10 MB).`);
  }

  const supabaseAdmin = createAdminSupabaseClient();

  for (const file of files) {
    const ext = path.extname(file.name);
    const objectPath = `${caseId}/${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from(FILES_BUCKET)
      .upload(objectPath, buffer, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error(`Kunde inte ladda upp ${file.name}: ${error.message}`);

    const { data: publicUrl } = supabaseAdmin.storage.from(FILES_BUCKET).getPublicUrl(objectPath);

    await prisma.fileAttachment.create({
      data: {
        namn: file.name,
        storlek: file.size,
        typ: file.type || "application/octet-stream",
        url: publicUrl.publicUrl,
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

// Extraherar lagringssökvägen ("<caseId>/<uuid>.<ext>") ur en public-URL, så
// vi kan ta bort objektet i Storage utan att spara sökvägen som ett eget
// fält - URL:en innehåller redan all information vi behöver.
function objectPathFromPublicUrl(url: string) {
  const marker = `/object/public/${FILES_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export async function removeFile(caseId: string, fileId: string) {
  await requireUser();
  const file = await prisma.fileAttachment.findUnique({ where: { id: fileId } });
  if (!file || file.caseId !== caseId) return;

  const objectPath = objectPathFromPublicUrl(file.url);
  if (objectPath) {
    const supabaseAdmin = createAdminSupabaseClient();
    await supabaseAdmin.storage.from(FILES_BUCKET).remove([objectPath]);
  }
  await prisma.fileAttachment.delete({ where: { id: fileId } });

  revalidatePath(`/arende/${caseId}`);
}

export async function addTimeEntry(caseId: string, formData: FormData) {
  const user = await requireUser();
  const current = await prisma.case.findUnique({ where: { id: caseId } });
  if (!current) return;
  if (user.role !== "ADMIN" && user.id !== current.tilldeladTAId) {
    throw new Error("Bara den tilldelade TA-plansritaren kan registrera timmar.");
  }

  const timmar = parseFloat(String(formData.get("timmar") || "").replace(",", "."));
  const kommentar = String(formData.get("kommentar") || "").trim();
  if (!Number.isFinite(timmar) || timmar <= 0) throw new Error("Ange ett giltigt antal timmar.");

  await prisma.timeEntry.create({
    data: { timmar, kommentar: kommentar || null, caseId, userId: user.id },
  });
  await prisma.case.update({
    where: { id: caseId },
    data: {
      uppdaterad: new Date(),
      historyEntries: {
        create: { text: `Registrerade ${timmar} timmar${kommentar ? ": " + kommentar : ""}`, userId: user.id },
      },
    },
  });

  revalidatePath(`/arende/${caseId}`);
}

export async function deleteTimeEntry(caseId: string, entryId: string) {
  const user = await requireUser();
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.caseId !== caseId) return;
  if (user.role !== "ADMIN" && entry.userId !== user.id) {
    throw new Error("Du kan bara ta bort dina egna tidsregistreringar.");
  }
  await prisma.timeEntry.delete({ where: { id: entryId } });
  revalidatePath(`/arende/${caseId}`);
}
