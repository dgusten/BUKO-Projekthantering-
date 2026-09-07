import { PrismaClient } from "@prisma/client";
import { createAdminSupabaseClient } from "../src/lib/supabase/server";

const prisma = new PrismaClient();
const supabaseAdmin = createAdminSupabaseClient();

// Delat dev-lösenord för alla testanvändare - byt/rotera innan riktiga
// medarbetare pekas mot samma projekt. Bara till för att kunna logga in och
// testa flödet lokalt.
const DEV_PASSWORD = "BukoDev2026!";

// Skapar (eller återanvänder, om den redan finns) ett riktigt Supabase
// Auth-konto per testanvändare, så inloggningssidan faktiskt går att testa.
// Kopplingen mot vår egen User-tabell sker via e-postadressen.
async function ensureAuthUser(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  });
  if (!error) return data.user;

  if (error.code === "email_exists") {
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === email);
    if (existing) return existing;
  }
  throw error;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000);
}

async function main() {
  await prisma.statusLogEntry.deleteMany();
  await prisma.historyEntry.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.tillstand.deleteMany();
  await prisma.caseLink.deleteMany();
  await prisma.case.deleteMany();
  await prisma.user.deleteMany();

  const seedUsers = [
    { id: "u1", name: "Anna Admin", role: "ADMIN" as const, initials: "AA", email: "anna.admin@buko.se" },
    { id: "u2", name: "Pelle Persson", role: "PL" as const, initials: "PP", email: "pelle.persson@buko.se" },
    { id: "u3", name: "Petra Nilsson", role: "PL" as const, initials: "PN", email: "petra.nilsson@buko.se" },
    { id: "u4", name: "Tomas Andersson", role: "TA" as const, initials: "TA", email: "tomas.andersson@buko.se" },
    { id: "u5", name: "Tina Karlsson", role: "TA" as const, initials: "TK", email: "tina.karlsson@buko.se" },
  ];

  for (const u of seedUsers) {
    await ensureAuthUser(u.email);
  }
  console.log(`Supabase Auth-konton klara. Dev-lösenord för alla: ${DEV_PASSWORD}`);

  const [anna, pelle, petra, tomas, tina] = await Promise.all(seedUsers.map((u) => prisma.user.create({ data: u })));

  const c1001 = await prisma.case.create({
    data: {
      id: "BUKO-1001",
      titel: "Ledningsarbete Storgatan",
      kund: "Norrköpings kommun",
      jobbnummer: "J-2026-0142",
      adress: "Storgatan 12, Norrköping",
      region: "EAST",
      beskrivning: "Grävarbete för fjärrvärme, kräver TA-plan för avstängning av ett körfält under 3 veckor.",
      svarighetsgrad: "SVAR",
      deadline: daysAgo(-10),
      status: "HOS_TA",
      skapadAvId: pelle.id,
      tilldeladTAId: tomas.id,
      skapad: daysAgo(6),
      historyEntries: {
        create: [
          { text: "Ärende skapat", userId: pelle.id, datum: daysAgo(6) },
          { text: "Tilldelat Tomas Andersson", userId: pelle.id, datum: daysAgo(6) },
        ],
      },
      statusLog: {
        create: [
          { status: "NY", datum: daysAgo(6) },
          { status: "HOS_TA", datum: daysAgo(6) },
        ],
      },
      comments: {
        create: [
          { text: "OBS: Busshållplats 20m bort måste hållas tillgänglig hela perioden.", userId: pelle.id, datum: daysAgo(5) },
        ],
      },
    },
  });

  const c1003 = await prisma.case.create({
    data: {
      id: "BUKO-1003",
      titel: "Kabelförläggning Industrigatan",
      kund: "Norrköpings kommun",
      jobbnummer: "J-2026-0151",
      adress: "Industrigatan 55, Norrköping",
      region: "EAST",
      beskrivning: "Nedgrävning av fiberkabel längs vägkant, kort sträcka men tung trafik i området.",
      svarighetsgrad: "MEDEL",
      deadline: daysAgo(-20),
      status: "TILLSTAND_SOKT",
      skapadAvId: pelle.id,
      tilldeladTAId: tomas.id,
      skapad: daysAgo(14),
      historyEntries: {
        create: [
          { text: "Ärende skapat", userId: pelle.id, datum: daysAgo(14) },
          { text: "Tilldelat Tomas Andersson", userId: pelle.id, datum: daysAgo(14) },
          { text: "TA-plan klar, skickat till projektledare", userId: tomas.id, datum: daysAgo(3) },
          { text: "Ansökan om tillstånd inskickad", userId: pelle.id, datum: daysAgo(0.5) },
        ],
      },
      statusLog: {
        create: [
          { status: "NY", datum: daysAgo(14) },
          { status: "HOS_TA", datum: daysAgo(14) },
          { status: "TA_KLAR", datum: daysAgo(3) },
          { status: "TILLSTAND_SOKT", datum: daysAgo(0.5) },
        ],
      },
    },
  });

  // Länka de två Norrköpings-ärendena som etapp 1/2 av samma projekt.
  await prisma.caseLink.create({ data: { caseId: c1001.id, linkedId: c1003.id } });
  await prisma.caseLink.create({ data: { caseId: c1003.id, linkedId: c1001.id } });

  const c1002 = await prisma.case.create({
    data: {
      id: "BUKO-1002",
      titel: "Asfaltering Kungsvägen",
      kund: "Linköpings kommun",
      jobbnummer: "J-2026-0139",
      adress: "Kungsvägen 4–18, Linköping",
      region: "MITT",
      beskrivning: "Omläggning av asfalt på befintlig gata, behöver skyltplan för gångtrafik och en filavstängning.",
      svarighetsgrad: "MEDEL",
      deadline: daysAgo(-3),
      status: "TA_KLAR",
      skapadAvId: petra.id,
      tilldeladTAId: tina.id,
      skapad: daysAgo(9),
      historyEntries: {
        create: [
          { text: "Ärende skapat", userId: petra.id, datum: daysAgo(9) },
          { text: "Tilldelat Tina Karlsson", userId: petra.id, datum: daysAgo(9) },
          { text: "TA-plan klar, skickat till projektledare", userId: tina.id, datum: daysAgo(1) },
        ],
      },
      statusLog: {
        create: [
          { status: "NY", datum: daysAgo(9) },
          { status: "HOS_TA", datum: daysAgo(9) },
          { status: "TA_KLAR", datum: daysAgo(1) },
        ],
      },
    },
  });

  const c1004 = await prisma.case.create({
    data: {
      id: "BUKO-1004",
      titel: "Trottoarrenovering Bispgatan",
      kund: "Linköpings kommun",
      jobbnummer: "J-2026-0155",
      adress: "Bispgatan 2, Linköping",
      region: "SYD",
      beskrivning: "Byte av kantsten och plattor, avstängning av gångbana krävs.",
      svarighetsgrad: "LATT",
      deadline: daysAgo(-25),
      status: "NY",
      skapadAvId: petra.id,
      skapad: daysAgo(1),
      historyEntries: { create: [{ text: "Ärende skapat", userId: petra.id, datum: daysAgo(1) }] },
      statusLog: { create: [{ status: "NY", datum: daysAgo(1) }] },
    },
  });

  console.log("Seed klar:", { anna: anna.id, pelle: pelle.id, petra: petra.id, tomas: tomas.id, tina: tina.id });
  console.log("Ärenden:", [c1001.id, c1002.id, c1003.id, c1004.id]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
