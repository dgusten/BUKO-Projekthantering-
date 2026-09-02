import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/meta";
import { tillstandStatus, mailtoReminder } from "@/lib/tillstand";
import { caseMatchesQuery } from "@/lib/caseSearch";
import SearchAndSort from "@/components/SearchAndSort";

export default async function TillstandPage(props: PageProps<"/tillstand">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  const cases = await prisma.case.findMany({
    where: { tillstand: { isNot: null } },
    include: { skapadAv: true, tilldeladTA: true, tillstand: true },
  });

  const filtered = cases.filter((c) => {
    const extra = [c.tillstand?.kundKontaktNamn, c.tillstand?.kundKontaktEmail].join(" ");
    return caseMatchesQuery(c, q) || extra.toLowerCase().includes(q.trim().toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => +new Date(a.tillstand!.slutdatum) - +new Date(b.tillstand!.slutdatum));

  const counts = { Aktivt: 0, "Löper snart ut": 0, Utgånget: 0 };
  for (const c of sorted) {
    const s = tillstandStatus(c.tillstand!);
    counts[s.label as keyof typeof counts]++;
  }

  return (
    <>
      <div className="topbar">
        <h1>Tillstånd</h1>
        <span className="crumb">BUKO Sverige / Tillstånd</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <h2>Tillstånd</h2>
              <p>Översikt över alla registrerade tillstånd och när de löper ut.</p>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="num">{counts["Aktivt"]}</div>
              <div className="label">Aktiva tillstånd</div>
            </div>
            <div className="stat-card">
              <div className="num">{counts["Löper snart ut"]}</div>
              <div className="label">Löper snart ut</div>
            </div>
            <div className="stat-card">
              <div className="num">{counts["Utgånget"]}</div>
              <div className="label">Utgångna</div>
            </div>
          </div>

          <div className="filter-row">
            <SearchAndSort placeholder="Sök på ärende, kund, projektledare, TA-plansritare, region, kontaktperson..." />
          </div>

          {sorted.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📜</div>
              <h3>Inga tillstånd hittades</h3>
              <p>
                {q
                  ? "Inget matchar din sökning."
                  : "När en TA-plan är klar, öppna ärendet och registrera tillståndets start- och slutdatum – det dyker upp här."}
              </p>
            </div>
          ) : (
            <div className="card card-pad">
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ärende</th>
                      <th>Kund</th>
                      <th>Giltighetstid</th>
                      <th>Status</th>
                      <th>Kontakt hos kund</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c) => {
                      const t = c.tillstand!;
                      const s = tillstandStatus(t);
                      const href = mailtoReminder({
                        caseId: c.id,
                        titel: c.titel,
                        adress: c.adress,
                        kund: c.kund,
                        slutdatumLabel: formatDate(t.slutdatum),
                        plEmail: c.skapadAv.email,
                        kundKontaktNamn: t.kundKontaktNamn,
                        kundKontaktEmail: t.kundKontaktEmail,
                      });
                      return (
                        <tr key={c.id}>
                          <td>
                            <Link href={`/arende/${c.id}`} className="link-btn">
                              {c.id}
                            </Link>
                            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{c.titel}</div>
                          </td>
                          <td>{c.kund}</td>
                          <td>
                            {formatDate(t.startdatum)} – {formatDate(t.slutdatum)}
                          </td>
                          <td>
                            <span className={`badge ${s.badge}`}>
                              <span className="dot" />
                              {s.label} · {s.daysLeft} d
                            </span>
                          </td>
                          <td>{t.kundKontaktNamn || "–"}</td>
                          <td style={{ textAlign: "right" }}>
                            <a className="btn btn-sm" href={href}>
                              ✉️ Skicka påminnelse
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="hint" style={{ marginTop: 14 }}>
            &quot;Skicka påminnelse&quot; öppnar ett utkast i din e-postklient till projektledaren och kundens
            kontaktperson – automatiska utskick kräver Microsoft Graph-integrationen.
          </div>
        </div>
      </div>
    </>
  );
}
