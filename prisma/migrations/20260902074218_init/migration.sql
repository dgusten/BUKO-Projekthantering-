-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titel" TEXT NOT NULL,
    "kund" TEXT NOT NULL,
    "jobbnummer" TEXT,
    "adress" TEXT NOT NULL,
    "region" TEXT,
    "beskrivning" TEXT NOT NULL,
    "svarighetsgrad" TEXT NOT NULL DEFAULT 'MEDEL',
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NY',
    "karta" TEXT,
    "skapadAvId" TEXT NOT NULL,
    "tilldeladTAId" TEXT,
    "skapad" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdaterad" DATETIME NOT NULL,
    CONSTRAINT "Case_skapadAvId_fkey" FOREIGN KEY ("skapadAvId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_tilldeladTAId_fkey" FOREIGN KEY ("tilldeladTAId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "linkedId" TEXT NOT NULL,
    CONSTRAINT "CaseLink_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseLink_linkedId_fkey" FOREIGN KEY ("linkedId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "datum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Comment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namn" TEXT NOT NULL,
    "storlek" INTEGER NOT NULL,
    "typ" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "datum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    "uppladdadAvId" TEXT NOT NULL,
    CONSTRAINT "FileAttachment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileAttachment_uppladdadAvId_fkey" FOREIGN KEY ("uppladdadAvId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "datum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "HistoryEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "datum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    CONSTRAINT "StatusLogEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tillstand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "startdatum" DATETIME,
    "slutdatum" DATETIME NOT NULL,
    "kundKontaktNamn" TEXT,
    "kundKontaktEmail" TEXT,
    "paminnelseDagarInnan" INTEGER NOT NULL DEFAULT 14,
    CONSTRAINT "Tillstand_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Case_skapadAvId_idx" ON "Case"("skapadAvId");

-- CreateIndex
CREATE INDEX "Case_tilldeladTAId_idx" ON "Case"("tilldeladTAId");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CaseLink_caseId_linkedId_key" ON "CaseLink"("caseId", "linkedId");

-- CreateIndex
CREATE INDEX "Comment_caseId_idx" ON "Comment"("caseId");

-- CreateIndex
CREATE INDEX "FileAttachment_caseId_idx" ON "FileAttachment"("caseId");

-- CreateIndex
CREATE INDEX "HistoryEntry_caseId_idx" ON "HistoryEntry"("caseId");

-- CreateIndex
CREATE INDEX "StatusLogEntry_caseId_idx" ON "StatusLogEntry"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Tillstand_caseId_key" ON "Tillstand"("caseId");
