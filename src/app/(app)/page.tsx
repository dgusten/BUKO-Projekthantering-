import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { caseMatchesQuery } from "@/lib/caseSearch";
import { CASE_SORTS, CASE_SORT_OPTIONS } from "@/lib/caseSort";
import CaseRow from "@/components/CaseRow";
import SearchAndSort from "@/components/SearchAndSort";
import type { Prisma } from "@prisma/client";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "uppdaterad";
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  const user = await requireUser();

  const scope: Prisma.CaseWhereInput =
    user.role === "ADMIN" ? {} : user.role === "PL" ? { skapadAvId: user.id } : { tilldeladTAId: user.id };

  const [cases, avslutadeCount] = await Promise.all([
    prisma.case.findMany({
      where: { ...scope, status: { not: "AVSLUTAT" } },
      include: { skapadAv: true, tilldeladTA: true },
    }),
    prisma.case.count({ where: { ...scope, status: "AVSLUTAT" } }),
  ]);

  const counts = { total: cases.length, hosTa: 0, tillstandSokt: 0 };
  for (const c of cases) {
    if (c.status === "HOS_TA") counts.hosTa++;
    if (c.status === "TILLSTAND_SOKT") counts.tillstandSokt++;
  }

  const filtered = cases.filter((c) => caseMatchesQuery(c, q));
  const sorted = [...filtered].sort(CASE_SORTS[sort] ?? CASE_SORTS.uppdaterad);

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
            <Link href="/avslutade" className="stat-card">
              <div className="num">{avslutadeCount}</div>
              <div className="label">Avslutade</div>
            </Link>
          </div>

          <div className="filter-row">
            <SearchAndSort
              placeholder="Sök på ärende, kund, projektledare, TA-plansritare, region..."
              sortOptions={CASE_SORT_OPTIONS}
            />
          </div>

          {sorted.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📂</div>
              <h3>Inga ärenden här än</h3>
              <p>
                {q
                  ? "Inget matchar din sökning."
                  : user.role === "PL"
                    ? "Skapa ditt första ärende för att komma igång."
                    : "Det finns inga ärenden att visa."}
              </p>
              {user.role === "PL" && !q && (
                <Link href="/skapa" className="btn btn-primary">
                  Skapa ärende
                </Link>
              )}
            </div>
          ) : (
            <div className="case-list">
              {sorted.map((c) => (
                <CaseRow key={c.id} c={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
