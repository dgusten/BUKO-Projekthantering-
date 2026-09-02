import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_META, STATUS_ORDER, STATUS_COLOR } from "@/lib/meta";
import { drawTimeMs, reachedStatus, formatDuration, monthBuckets } from "@/lib/stats";

function BarChartRows({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Ingen data än.</div>;
  return (
    <>
      {rows.map((r) => (
        <div className="chart-row" key={r.label}>
          <div className="chart-label" title={r.label}>
            {r.label}
          </div>
          <div className="chart-bar-track">
            <div className="chart-bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <div className="chart-value">{r.display}</div>
        </div>
      ))}
    </>
  );
}

export default async function StatistikPage() {
  const cases = await prisma.case.findMany({
    include: { tilldeladTA: true, statusLog: { orderBy: { datum: "asc" } } },
  });
  const taUsers = await prisma.user.findMany({ where: { role: "TA" }, orderBy: { name: "asc" } });

  const totalCases = cases.length;
  const closed = cases.filter((c) => c.status === "AVSLUTAT").length;
  const open = totalCases - closed;

  let totalDrawMs = 0;
  let totalDrawCount = 0;
  for (const c of cases) {
    if (reachedStatus(c.statusLog, "TA_KLAR")) {
      totalDrawMs += drawTimeMs(c.statusLog).totalMs;
      totalDrawCount++;
    }
  }
  const avgDrawMs = totalDrawCount > 0 ? totalDrawMs / totalDrawCount : null;

  const perTA = taUsers.map((ta) => {
    const taCases = cases.filter((c) => c.tilldeladTAId === ta.id);
    let ms = 0;
    let completed = 0;
    for (const c of taCases) {
      ms += drawTimeMs(c.statusLog).totalMs;
      if (reachedStatus(c.statusLog, "TA_KLAR")) completed++;
    }
    return { ta, completed, avgMs: completed > 0 ? ms / completed : null };
  });

  const countRows = perTA.map((t) => ({ label: t.ta.name, value: t.completed, display: `${t.completed} st` }));
  const timeRows = perTA
    .filter((t) => t.avgMs != null)
    .map((t) => ({ label: t.ta.name, value: t.avgMs!, display: formatDuration(t.avgMs) }));

  const statusCounts = STATUS_ORDER.map((s) => ({ status: s, count: cases.filter((c) => c.status === s).length })).filter(
    (s) => s.count > 0
  );
  const totalForSeg = Math.max(1, statusCounts.reduce((a, s) => a + s.count, 0));

  const months = monthBuckets(cases.map((c) => c.skapad), 6);
  const maxMonth = Math.max(1, ...months.map((m) => m.count));

  const tableRows = cases
    .map((c) => ({ c, d: drawTimeMs(c.statusLog), done: reachedStatus(c.statusLog, "TA_KLAR") }))
    .filter((r) => r.done || r.d.ongoingSinceMs)
    .sort((a, b) => {
      const aMs = a.d.totalMs + (a.d.ongoingSinceMs ? Date.now() - a.d.ongoingSinceMs : 0);
      const bMs = b.d.totalMs + (b.d.ongoingSinceMs ? Date.now() - b.d.ongoingSinceMs : 0);
      return bMs - aMs;
    });

  return (
    <>
      <div className="topbar">
        <h1>Statistik</h1>
        <span className="crumb">BUKO Sverige / Statistik</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <h2>Statistik</h2>
              <p>Överblick över genomströmning och ritningstider – hur många TA-planer som gjorts och hur lång tid de tagit.</p>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="num">{totalCases}</div>
              <div className="label">Totalt antal ärenden</div>
            </div>
            <div className="stat-card">
              <div className="num">{open}</div>
              <div className="label">Pågående</div>
            </div>
            <div className="stat-card">
              <div className="num">{closed}</div>
              <div className="label">Avslutade</div>
            </div>
            <div className="stat-card">
              <div className="num">{formatDuration(avgDrawMs)}</div>
              <div className="label">Snitt tid att rita TA-plan</div>
            </div>
          </div>

          <div className="detail-grid" style={{ marginBottom: 16 }}>
            <div className="card card-pad">
              <div className="section-title">TA-planer klara per TA-plansritare</div>
              <BarChartRows rows={countRows} />
            </div>
            <div className="card card-pad">
              <div className="section-title">Snitt-tid att rita TA-plan</div>
              <BarChartRows rows={timeRows} />
            </div>
          </div>

          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="section-title">Ärenden per status</div>
            <div className="segbar">
              {statusCounts.map((s) => (
                <div
                  key={s.status}
                  className="segbar-seg"
                  style={{ width: `${(s.count / totalForSeg) * 100}%`, background: STATUS_COLOR[s.status] }}
                />
              ))}
            </div>
            <div className="legend">
              {statusCounts.map((s) => (
                <div className="legend-item" key={s.status}>
                  <span className="legend-dot" style={{ background: STATUS_COLOR[s.status] }} />
                  {STATUS_META[s.status].label} ({s.count})
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="section-title">Skapade ärenden per månad</div>
            <div className="month-chart">
              {months.map((m) => (
                <div className="month-bar-col" key={m.label + m.count}>
                  <div className="month-bar-value">{m.count}</div>
                  <div className="month-bar" style={{ height: `${(m.count / maxMonth) * 100}%` }} />
                  <div className="month-bar-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">Ritningstid per ärende</div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Ärende</th>
                    <th>TA-plansritare</th>
                    <th>Status</th>
                    <th>Tid hos TA-plansritare</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ color: "var(--ink-faint)" }}>
                        Ingen data än.
                      </td>
                    </tr>
                  )}
                  {tableRows.map(({ c, d }) => {
                    const ms = d.totalMs + (d.ongoingSinceMs ? Date.now() - d.ongoingSinceMs : 0);
                    return (
                      <tr key={c.id}>
                        <td>
                          <Link href={`/arende/${c.id}`} className="link-btn">
                            {c.id}
                          </Link>
                        </td>
                        <td>{c.tilldeladTA?.name ?? "–"}</td>
                        <td>
                          <span className={`badge ${STATUS_META[c.status].badge}`}>
                            <span className="dot" />
                            {STATUS_META[c.status].label}
                          </span>
                        </td>
                        <td>
                          {formatDuration(ms)}
                          {d.ongoingSinceMs ? " (pågår)" : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
