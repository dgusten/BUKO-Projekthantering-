import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { STATUS_META, SEVERITY_META, REGION_META, formatDate, formatBytes } from "@/lib/meta";
import {
  addComment,
  assignTA,
  transitionStatus,
  saveTillstand,
  uploadFiles,
  removeFile,
  sendTillstandReminder,
  addTimeEntry,
  deleteTimeEntry,
} from "@/app/actions";
import { tillstandStatus } from "@/lib/tillstand";
import SketchMap from "@/components/SketchMap";

export default async function CaseDetailPage(props: PageProps<"/arende/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      skapadAv: true,
      tilldeladTA: true,
      comments: { include: { user: true }, orderBy: { datum: "asc" } },
      historyEntries: { include: { user: true }, orderBy: { datum: "desc" } },
      linksFrom: { include: { linked: true } },
      statusLog: true,
      tillstand: true,
      files: { include: { uppladdadAv: true }, orderBy: { datum: "desc" } },
      timeEntries: { include: { user: true }, orderBy: { datum: "desc" } },
    },
  });

  if (!c) notFound();

  const status = STATUS_META[c.status];
  const severity = SEVERITY_META[c.svarighetsgrad];
  const isOwnerPL = user.id === c.skapadAvId || user.role === "ADMIN";
  const isAssignedTA = user.id === c.tilldeladTAId || user.role === "ADMIN";
  const reachedTaKlar = c.statusLog.some((s) => s.status === "TA_KLAR");
  let karta = null;
  try {
    karta = c.karta ? JSON.parse(c.karta) : null;
  } catch {
    karta = null;
  }

  const isUnclaimedTA = !c.tilldeladTAId;
  const canAssignTA =
    (c.status === "NY" || c.status === "HOS_TA") &&
    (isOwnerPL || (user.role === "TA" && (isUnclaimedTA || c.tilldeladTAId === user.id)));
  const taUsers = canAssignTA ? await prisma.user.findMany({ where: { role: "TA" }, orderBy: { name: "asc" } }) : [];
  const canLogTime = user.role === "ADMIN" || user.id === c.tilldeladTAId;
  const totalTimmar = c.timeEntries.reduce((sum, t) => sum + t.timmar, 0);

  const addCommentForCase = addComment.bind(null, c.id);
  const assignTAForCase = assignTA.bind(null, c.id);
  const saveTillstandForCase = saveTillstand.bind(null, c.id);
  const uploadFilesForCase = uploadFiles.bind(null, c.id);
  const addTimeEntryForCase = addTimeEntry.bind(null, c.id);
  const deleteTimeEntryForCase = deleteTimeEntry.bind(null, c.id);
  const goTaKlar = transitionStatus.bind(null, c.id, "TA_KLAR", "TA-plan klar, skickat till projektledare");
  const goTillstandSokt = transitionStatus.bind(null, c.id, "TILLSTAND_SOKT", "Ansökan om tillstånd inskickad");
  const goJustering = transitionStatus.bind(null, c.id, "HOS_TA", "Skickat tillbaka till TA-plansritare för justering");
  const goBeviljat = transitionStatus.bind(null, c.id, "TILLSTAND_BEVILJAT", "Tillstånd beviljat");
  const goAvslag = transitionStatus.bind(null, c.id, "TILLSTAND_AVSLAG", "Tillstånd avslaget");
  const goTillbakaEfterAvslag = transitionStatus.bind(null, c.id, "HOS_TA", "Skickat tillbaka till TA-plansritare efter avslag");
  const goAvslutat = transitionStatus.bind(null, c.id, "AVSLUTAT", "Ärende avslutat");

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
            {isOwnerPL && (
              <Link href={`/skapa?kopieraFran=${c.id}`} className="btn btn-sm">
                📋 Kopiera ärende (ny etapp)
              </Link>
            )}
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
                  <div>
                    <div className="kv-label">Fakturerat</div>
                    <div className="kv-value">{c.fakturerat ? "Ja" : "Nej"}</div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="kv-label" style={{ marginBottom: 6 }}>
                    Beskrivning
                  </div>
                  <div className="desc-block">{c.beskrivning}</div>
                </div>
              </div>

              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div className="section-title">Tidsregistrering</div>
                {c.timeEntries.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 14 }}>
                    Inga timmar registrerade än.
                  </div>
                ) : (
                  <div className="file-list" style={{ marginBottom: 14 }}>
                    {c.timeEntries.map((t) => (
                      <div className="file-item" key={t.id}>
                        <span className="file-icon">{t.timmar}h</span>
                        <span className="file-meta">
                          <div className="file-name">
                            {t.user.name} · {formatDate(t.datum)}
                          </div>
                          {t.kommentar && <div className="file-sub">{t.kommentar}</div>}
                        </span>
                        {(user.role === "ADMIN" || user.id === t.userId) && (
                          <form action={deleteTimeEntryForCase.bind(null, t.id)}>
                            <button type="submit" className="btn btn-sm btn-ghost" title="Ta bort">
                              ✕
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: canLogTime ? 14 : 0 }}>
                  Totalt: {totalTimmar} timmar
                </div>
                {canLogTime && (
                  <form action={addTimeEntryForCase} className="form-row" style={{ alignItems: "end" }}>
                    <div className="form-group" style={{ marginBottom: 0, maxWidth: 110 }}>
                      <label>Timmar</label>
                      <input type="text" inputMode="decimal" name="timmar" placeholder="t.ex. 2,5" required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label>Kommentar (valfritt)</label>
                      <input type="text" name="kommentar" placeholder="Vad gjordes?" />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginBottom: 0 }}>
                      Registrera
                    </button>
                  </form>
                )}
              </div>

              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div className="section-title">Karta &amp; arbetsområde</div>
                <SketchMap initialValue={karta} editable={false} />
              </div>

              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div className="section-title">Filer &amp; ritningar</div>
                <div className="file-list">
                  {c.files.length === 0 && (
                    <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Inga filer uppladdade än.</div>
                  )}
                  {c.files.map((f) => (
                    <div className="file-item" key={f.id}>
                      <span className="file-icon">{(f.namn.split(".").pop() || "?").slice(0, 3).toUpperCase()}</span>
                      <span className="file-meta">
                        <div className="file-name">{f.namn}</div>
                        <div className="file-sub">
                          {formatBytes(f.storlek)} · uppladdad av {f.uppladdadAv.name}
                        </div>
                      </span>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost" title="Öppna i nytt fönster">
                        ↗️
                      </a>
                      <form action={removeFile.bind(null, c.id, f.id)}>
                        <button type="submit" className="btn btn-sm btn-ghost" title="Ta bort">
                          ✕
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
                <form action={uploadFilesForCase} className="form-row" style={{ alignItems: "end" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Ladda upp fil (ritning, PDF, bild)</label>
                    <input type="file" name="files" multiple />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginBottom: 0 }}>
                    Ladda upp
                  </button>
                </form>
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
                <form action={addCommentForCase}>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <textarea name="text" placeholder="Skriv en kommentar..." style={{ minHeight: 64 }} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Skicka kommentar
                  </button>
                </form>
              </div>
            </div>

            <div>
              <div className="card card-pad action-panel" style={{ marginBottom: 16 }}>
                <div className="section-title">Åtgärder</div>

                {canAssignTA && (
                  <>
                    {user.role === "TA" && isUnclaimedTA && (
                      <form action={assignTAForCase} style={{ marginBottom: 10 }}>
                        <input type="hidden" name="taId" value={user.id} />
                        <button type="submit" className="btn btn-primary btn-block">
                          🙋 Ta jobbet själv
                        </button>
                      </form>
                    )}
                    <form action={assignTAForCase}>
                      <div className="form-group">
                        <label>{c.tilldeladTAId ? "Byt TA-plansritare" : "Tilldela TA-plansritare"}</label>
                        <select name="taId" defaultValue="">
                          <option value="" disabled>
                            Välj...
                          </option>
                          {taUsers.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className={`btn btn-block ${user.role === "TA" && isUnclaimedTA ? "" : "btn-primary"}`}
                      >
                        {c.tilldeladTAId ? "Byt TA-plansritare" : "Tilldela"}
                      </button>
                    </form>
                  </>
                )}

                {c.status === "HOS_TA" && isAssignedTA && (
                  <form action={goTaKlar}>
                    <button type="submit" className="btn btn-primary btn-block">
                      Skicka tillbaka till projektledare
                    </button>
                  </form>
                )}

                {c.status === "TA_KLAR" && isOwnerPL && (
                  <>
                    <form action={goTillstandSokt}>
                      <button type="submit" className="btn btn-primary btn-block">
                        Ansök om tillstånd
                      </button>
                    </form>
                    <form action={goJustering}>
                      <button type="submit" className="btn btn-block">
                        Begär justering av TA-plan
                      </button>
                    </form>
                  </>
                )}

                {c.status === "TILLSTAND_SOKT" && isOwnerPL && (
                  <>
                    <form action={goBeviljat} style={{ marginBottom: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 10 }}>
                        <input type="checkbox" name="fakturerat" required />
                        Kunden är fakturerad
                      </label>
                      <button type="submit" className="btn btn-primary btn-block">
                        Markera tillstånd beviljat
                      </button>
                    </form>
                    <form action={goAvslag}>
                      <button type="submit" className="btn btn-danger btn-block">
                        Markera tillstånd avslaget
                      </button>
                    </form>
                  </>
                )}

                {c.status === "TILLSTAND_AVSLAG" && isOwnerPL && (
                  <>
                    <form action={goTillbakaEfterAvslag}>
                      <button type="submit" className="btn btn-primary btn-block">
                        Skicka tillbaka till TA-plansritare
                      </button>
                    </form>
                    <form action={goAvslutat}>
                      <button type="submit" className="btn btn-block">
                        Avsluta ärende
                      </button>
                    </form>
                  </>
                )}

                {c.status === "TILLSTAND_BEVILJAT" && isOwnerPL && (
                  <form action={goAvslutat}>
                    <button type="submit" className="btn btn-primary btn-block">
                      Avsluta ärende
                    </button>
                  </form>
                )}

                {!(
                  c.status === "NY" ||
                  (c.status === "HOS_TA" && isAssignedTA) ||
                  (c.status === "TA_KLAR" && isOwnerPL) ||
                  (c.status === "TILLSTAND_SOKT" && isOwnerPL) ||
                  (c.status === "TILLSTAND_AVSLAG" && isOwnerPL) ||
                  (c.status === "TILLSTAND_BEVILJAT" && isOwnerPL)
                ) && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Inga åtgärder tillgängliga för dig i detta steg.</p>}
              </div>

              {reachedTaKlar && (
                <div className="card card-pad" style={{ marginBottom: 16 }}>
                  <div className="section-title">Tillstånd</div>
                  {c.tillstand ? (
                    <>
                      <div className="kv-grid" style={{ marginBottom: 14 }}>
                        <div>
                          <div className="kv-label">Status</div>
                          <div className="kv-value">
                            {(() => {
                              const s = tillstandStatus(c.tillstand);
                              return (
                                <span className={`badge ${s.badge}`}>
                                  <span className="dot" />
                                  {s.label} · {s.daysLeft} dagar
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="kv-label">Giltighetstid</div>
                          <div className="kv-value">
                            {formatDate(c.tillstand.startdatum)} – {formatDate(c.tillstand.slutdatum)}
                          </div>
                        </div>
                        <div>
                          <div className="kv-label">Kontakt hos kund</div>
                          <div className="kv-value">{c.tillstand.kundKontaktNamn || "–"}</div>
                        </div>
                        <div>
                          <div className="kv-label">E-post kund</div>
                          <div className="kv-value">{c.tillstand.kundKontaktEmail || "–"}</div>
                        </div>
                      </div>
                      <form action={sendTillstandReminder.bind(null, c.id)} style={{ marginBottom: 14 }}>
                        <button type="submit" className="btn btn-sm btn-block">
                          ✉️ Skicka påminnelse (PL + kund)
                        </button>
                      </form>
                    </>
                  ) : (
                    <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 12px" }}>
                      Inget tillstånd registrerat än.
                    </p>
                  )}
                  <form action={saveTillstandForCase}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Startdatum</label>
                        <input
                          type="date"
                          name="startdatum"
                          defaultValue={c.tillstand?.startdatum ? new Date(c.tillstand.startdatum).toISOString().slice(0, 10) : ""}
                        />
                      </div>
                      <div className="form-group">
                        <label>Slutdatum</label>
                        <input
                          type="date"
                          name="slutdatum"
                          required
                          defaultValue={c.tillstand?.slutdatum ? new Date(c.tillstand.slutdatum).toISOString().slice(0, 10) : ""}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Ansvarig hos kund</label>
                      <input type="text" name="kundKontaktNamn" placeholder="Namn" defaultValue={c.tillstand?.kundKontaktNamn ?? ""} />
                    </div>
                    <div className="form-group">
                      <label>E-post till kundens ansvarige</label>
                      <input
                        type="text"
                        name="kundKontaktEmail"
                        placeholder="namn@kund.se"
                        defaultValue={c.tillstand?.kundKontaktEmail ?? ""}
                      />
                    </div>
                    <div className="form-group">
                      <label>Påminnelse (dagar innan tillståndet löper ut)</label>
                      <input type="text" name="paminnelseDagarInnan" defaultValue={c.tillstand?.paminnelseDagarInnan ?? 14} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm btn-block">
                      {c.tillstand ? "Uppdatera tillstånd" : "Registrera tillstånd"}
                    </button>
                  </form>
                </div>
              )}

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
