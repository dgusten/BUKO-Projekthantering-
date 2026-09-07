-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PL', 'TA');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('NY', 'HOS_TA', 'TA_KLAR', 'TILLSTAND_SOKT', 'TILLSTAND_AVSLAG', 'TILLSTAND_BEVILJAT', 'AVSLUTAT');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LATT', 'MEDEL', 'SVAR');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NORD', 'MITT', 'EAST', 'VAST', 'SYD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL,
    "initials" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "kund" TEXT NOT NULL,
    "jobbnummer" TEXT,
    "adress" TEXT NOT NULL,
    "region" "Region",
    "beskrivning" TEXT NOT NULL,
    "svarighetsgrad" "Severity" NOT NULL DEFAULT 'MEDEL',
    "deadline" TIMESTAMP(3),
    "status" "CaseStatus" NOT NULL DEFAULT 'NY',
    "karta" TEXT,
    "skapadAvId" TEXT NOT NULL,
    "tilldeladTAId" TEXT,
    "skapad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdaterad" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseLink" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "linkedId" TEXT NOT NULL,

    CONSTRAINT "CaseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAttachment" (
    "id" TEXT NOT NULL,
    "namn" TEXT NOT NULL,
    "storlek" INTEGER NOT NULL,
    "typ" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    "uppladdadAvId" TEXT NOT NULL,

    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryEntry" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "HistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusLogEntry" (
    "id" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "StatusLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tillstand" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "startdatum" TIMESTAMP(3),
    "slutdatum" TIMESTAMP(3) NOT NULL,
    "kundKontaktNamn" TEXT,
    "kundKontaktEmail" TEXT,
    "paminnelseDagarInnan" INTEGER NOT NULL DEFAULT 14,

    CONSTRAINT "Tillstand_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_skapadAvId_fkey" FOREIGN KEY ("skapadAvId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_tilldeladTAId_fkey" FOREIGN KEY ("tilldeladTAId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLink" ADD CONSTRAINT "CaseLink_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLink" ADD CONSTRAINT "CaseLink_linkedId_fkey" FOREIGN KEY ("linkedId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_uppladdadAvId_fkey" FOREIGN KEY ("uppladdadAvId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLogEntry" ADD CONSTRAINT "StatusLogEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tillstand" ADD CONSTRAINT "Tillstand_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
