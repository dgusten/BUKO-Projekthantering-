import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_META, STATUS_ORDER } from "@/lib/meta";
import { caseMatchesQuery } from "@/lib/caseSearch";
import CaseRow from "@/components/CaseRow";
import SearchAndSort from "@/components/SearchAndSort";

const SORTS: Record<string, (a: any, b: any) => number> = {
  uppdaterad: (a, b) => +new Date(b.uppdaterad) - +new Date(a.uppdaterad),
  status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  deadline: (a, b) => +new Date(a.deadline ?? "9999-12-31") - +new Date(b.deadline ?? "9999-12-31"),
  dagar: (a, b) => +new Date(a._enteredAt) - +new Date(b._enteredAt),
  titel: (a, b) => a.titel.localeCompare(b.titel, "sv"),
};

const SORT_OPTIONS = [
  { value: "uppdaterad", label: "Senast uppdaterad" },
  { value: "status", label: "Status" },
  { value: "deadline", label: "Deadline (närmast först)" },
  { value: "dagar", label: "Flest dagar i nuvarande steg" },
  { value: "titel", label: "Titel (A–Ö)" },
];

function enteredAt(statusLog: { status: string; datum: Date }[], currentStatus: string) {
  let i = statusLog.length - 1;
  while (i > 0 && statusLog[i - 1].status === currentStatus) i--;
  return statusLog[i]?.datum ?? new Date();
}

export default async function PagaendePage(props: PageProps<"/pagaende">) {
  const searchParams = await props.searchParams;
  const filter = typeof searchParams.filter === "string" ? searchParams.filter : "alla";
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "uppdaterad";
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  const cases = await prisma.case.findMany({
    where: { status: { not: "AVSLUTAT" } },
    include: { skapadAv: true, tilldeladTA: true, statusLog: { orderBy: { datum: "asc" } } },
  });

  const counts: Record<string, number> = {};
  for (const c of cases) counts[c.status] = (counts[c.status] ?? 0) + 1;
  const presentStatuses = STATUS_ORDER.filter((s) => s !== "AVSLUTAT" && counts[s] > 0);

  const withEnteredAt = cases.map((c) => ({ ...c, _enteredAt: enteredAt(c.statusLog, c.status) }));
  const byStatus = filter === "alla" ? withEnteredAt : withEnteredAt.filter((c) => c.status === filter);
  const filtered = byStatus.filter((c) => caseMatchesQuery(c, q));
  const sorted = [...filtered].sort(SORTS[sort] ?? SORTS.uppdaterad);

  function chipHref(status: string) {
    const params = new URLSearchParams();
    if (status !== "alla") params.set("filter", status);
    if (sort !== "uppdaterad") params.set("sort", sort);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/pagaende${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <div className="topbar">
        <h1>Pågående ärenden</h1>
        <span className="crumb">BUKO Sverige / Pågående ärenden</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <h2>Pågående ärenden</h2>
              <p>Alla aktiva ärenden i hela teamet – se vem som arbetar med vad.</p>
            </div>
          </div>

          <div className="filter-row">
            <Link href={chipHref("alla")} className={`filter-chip ${filter === "alla" ? "active" : ""}`}>
              Alla
            </Link>
            {presentStatuses.map((s) => (
              <Link key={s} href={chipHref(s)} className={`filter-chip ${filter === s ? "active" : ""}`}>
                {STATUS_META[s].label}
              </Link>
            ))}
            <SearchAndSort
              placeholder="Sök på ärende, kund, projektledare, TA-plansritare, region..."
              sortOptions={SORT_OPTIONS}
            />
          </div>

          {sorted.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🗂️</div>
              <h3>Inga pågående ärenden</h3>
              <p>{q ? "Inget matchar din sökning." : "Inget matchar det valda filtret just nu."}</p>
            </div>
          ) : (
            <div className="case-list">
              {sorted.map((c) => (
                <CaseRow
                  key={c.id}
                  c={c}
                  daysInStatus={Math.floor((Date.now() - +new Date(c._enteredAt)) / 86400000)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
