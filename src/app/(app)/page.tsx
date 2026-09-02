import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { STATUS_META, REGION_META, formatDate } from "@/lib/meta";
import type { Prisma } from "@prisma/client";

export default async function Home() {
  const user = (await getCurrentUser())!;

  const where: Prisma.CaseWhereInput =
    user.role === "ADMIN" ? {} : user.role === "PL" ? { skapadAvId: user.id } : { tilldeladTAId: user.id };

  const cases = await prisma.case.findMany({
    where,
    orderBy: { uppdaterad: "desc" },
    include: { skapadAv: true, tilldeladTA: true },
  });

  const counts = { total: cases.length, hosTa: 0, tillstandSokt: 0, avslutat: 0 };
  for (const c of cases) {
    if (c.status === "HOS_TA") counts.hosTa++;
    if (c.status === "TILLSTAND_SOKT") counts.tillstandSokt++;
    if (c.status === "AVSLUTAT") counts.avslutat++;
  }

  const title = user.role === "ADMIN" ? "Alla ärenden" : "Mina ärenden";

  return (
    <>
      <div className="topbar">
        <h1>{title}</h1>
        <span className="crumb">BUKO Sverige / Ärenden</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <h2>{title}</h2>
              <p>Översikt över ärenden och status i handläggningsflödet.</p>
            </div>
            {user.role === "PL" && (
              <Link href="/skapa" className="btn btn-primary">
                ➕ Skapa ärende
              </Link>
            )}
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="num">{counts.total}</div>
              <div className="label">Totalt</div>
            </div>
            <div className="stat-card">
              <div className="num">{counts.hosTa}</div>
              <div className="label">Hos TA-plansritare</div>
            </div>
            <div className="stat-card">
              <div className="num">{counts.tillstandSokt}</div>
              <div className="label">Väntar tillstånd</div>
            </div>
            <div className="stat-card">
              <div className="num">{counts.avslutat}</div>
              <div className="label">Avslutade</div>
            </div>
          </div>

          {cases.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📂</div>
              <h3>Inga ärenden här än</h3>
              <p>
                {user.role === "PL"
                  ? "Skapa ditt första ärende för att komma igång."
                  : "Det finns inga ärenden att visa."}
              </p>
              {user.role === "PL" && (
                <Link href="/skapa" className="btn btn-primary">
                  Skapa ärende
                </Link>
              )}
            </div>
          ) : (
            <div className="case-list">
              {cases.map((c) => {
                const status = STATUS_META[c.status];
                return (
                  <Link key={c.id} href={`/arende/${c.id}`} className="case-row">
                    <div className="case-row-main">
                      <div className="case-row-title">
                        <span className="case-id">{c.id}</span> {c.titel}
                      </div>
                      <div className="case-row-meta">
                        <span>📍 {c.adress}</span>
                        <span>🧭 {c.region ? REGION_META[c.region] : "Ingen region"}</span>
                        <span>👤 PL: {c.skapadAv.name}</span>
                        <span>✏️ TA: {c.tilldeladTA?.name ?? "Ej tilldelad"}</span>
                        <span>📅 {formatDate(c.deadline)}</span>
                      </div>
                    </div>
                    <div className="case-row-right">
                      <span className={`badge ${status.badge}`}>
                        <span className="dot" />
                        {status.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
