import { prisma } from "@/lib/prisma";
import { caseMatchesQuery } from "@/lib/caseSearch";
import { CASE_SORTS, CASE_SORT_OPTIONS } from "@/lib/caseSort";
import CaseRow from "@/components/CaseRow";
import SearchAndSort from "@/components/SearchAndSort";

export default async function AvslutadePage(props: PageProps<"/avslutade">) {
  const searchParams = await props.searchParams;
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "uppdaterad";
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  const cases = await prisma.case.findMany({
    where: { status: "AVSLUTAT" },
    include: { skapadAv: true, tilldeladTA: true },
  });

  const filtered = cases.filter((c) => caseMatchesQuery(c, q));
  const sorted = [...filtered].sort(CASE_SORTS[sort] ?? CASE_SORTS.uppdaterad);

  return (
    <>
      <div className="topbar">
        <h1>Avslutade ärenden</h1>
        <span className="crumb">BUKO Sverige / Avslutade ärenden</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <h2>Avslutade ärenden</h2>
              <p>Färdiga ärenden i hela teamet.</p>
            </div>
          </div>

          <div className="filter-row">
            <SearchAndSort
              placeholder="Sök på ärende, kund, projektledare, TA-plansritare, region..."
              sortOptions={CASE_SORT_OPTIONS}
            />
          </div>

          {sorted.length === 0 ? (
            <div className="empty-state">
              <div className="icon">✅</div>
              <h3>Inga avslutade ärenden</h3>
              <p>{q ? "Inget matchar din sökning." : "Inget ärende har avslutats än."}</p>
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
