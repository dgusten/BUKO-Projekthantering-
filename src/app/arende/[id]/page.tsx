import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STATUS_META, SEVERITY_META, REGION_META, formatDate } from "@/lib/meta";

export default async function CaseDetailPage(props: PageProps<"/arende/[id]">) {
  const { id } = await props.params;

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      skapadAv: true,
      tilldeladTA: true,
      comments: { include: { user: true }, orderBy: { datum: "asc" } },
      historyEntries: { include: { user: true }, orderBy: { datum: "desc" } },
      linksFrom: { include: { linked: true } },
    },
  });

  if (!c) notFound();

  const status = STATUS_META[c.status];
  const severity = SEVERITY_META[c.svarighetsgrad];

  return (
    <>
      <div className="topbar">
        <h1>{c.id}</h1>
        <span className="crumb">BUKO Sverige / {c.id}</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <Link href="/" className="link-btn" style={{ marginBottom: 14, display: "inline-block" }}>
            ← Tillbaka till ärenden
          </Link>

          <div className="detail-header">
            <div>
              <span className="case-id">{c.id}</span>
              <h2>{c.titel}</h2>
              <span className={`badge ${status.badge}`}>
                <span className="dot" />
                {status.label}
              </span>{" "}
              <span className="badge" style={{ background: severity.bg, color: severity.color }}>
                <span className="dot" style={{ background: severity.color }} />
                {severity.label}
              </span>
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div className="section-title">Ärendeinformation</div>
                <div className="kv-grid">
                  <div>
                    <div className="kv-label">Kund</div>
                    <div className="kv-value">{c.kund}</div>
                  </div>
                  <div>
                    <div className="kv-label">Jobbnummer</div>
                    <div className="kv-value">{c.jobbnummer || "–"}</div>
                  </div>
                  <div>
                    <div className="kv-label">Region</div>
                    <div className="kv-value">{c.region ? REGION_META[c.region] : "Ingen region"}</div>
                  </div>
                  <div>
                    <div className="kv-label">Adress / plats</div>
                    <div className="kv-value">{c.adress}</div>
                  </div>
                  <div>
                    <div className="kv-label">Sista dag för färdigställande</div>
                    <div className="kv-value">{formatDate(c.deadline)}</div>
                  </div>
                  <div>
                    <div className="kv-label">Projektledare</div>
                    <div className="kv-value">{c.skapadAv.name}</div>
                  </div>
                  <div>
                    <div className="kv-label">TA-plansritare</div>
                    <div className="kv-value">{c.tilldeladTA?.name ?? "Ej tilldelad"}</div>
                  </div>
                  <div>
                    <div className="kv-label">Senast uppdaterad</div>
                    <div className="kv-value">{formatDate(c.uppdaterad)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="kv-label" style={{ marginBottom: 6 }}>
                    Beskrivning
                  </div>
                  <div className="desc-block">{c.beskrivning}</div>
                </div>
              </div>

              {c.linksFrom.length > 0 && (
                <div className="card card-pad" style={{ marginBottom: 16 }}>
                  <div className="section-title">Kopplade ärenden – etapper &amp; faser</div>
                  <div className="file-list">
                    {c.linksFrom.map((link) => (
                      <Link key={link.linked.id} href={`/arende/${link.linked.id}`} className="file-item">
                        <span className="file-icon">{link.linked.id.slice(-2)}</span>
                        <span className="file-meta">
                          <div className="file-name">
                            {link.linked.id} · {link.linked.titel}
                          </div>
                          <div className="file-sub">{STATUS_META[link.linked.status].label}</div>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="card card-pad">
                <div className="section-title">Kommentarer</div>
                <div className="comment-list">
                  {c.comments.length === 0 && (
                    <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Inga kommentarer än.</div>
                  )}
                  {c.comments.map((k) => (
                    <div key={k.id} className="comment-item">
                      <span className="avatar">{k.user.initials}</span>
                      <div className="comment-body">
                        <div className="comment-head">
                          <span className="comment-author">{k.user.name}</span>
                          <span className="comment-time">{formatDate(k.datum)}</span>
                        </div>
                        <div className="comment-text">{k.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hint">Att skriva nya kommentarer kräver inloggning, som inte är inkopplad än.</div>
              </div>
            </div>

            <div>
              <div className="card card-pad">
                <div className="section-title">Historik</div>
                <div className="timeline">
                  {c.historyEntries.map((h) => (
                    <div key={h.id} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-body">
                        <div className="timeline-text">{h.text}</div>
                        <div className="timeline-meta">
                          {h.user?.name ?? "System"} · {formatDate(h.datum)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
