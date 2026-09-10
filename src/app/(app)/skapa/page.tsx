import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { REGION_META } from "@/lib/meta";
import { createCase } from "@/app/actions";
import SketchMap from "@/components/SketchMap";

export default async function SkapaArendePage(props: PageProps<"/skapa">) {
  const user = await requireUser();
  if (user.role !== "PL" && user.role !== "ADMIN") redirect("/");

  const searchParams = await props.searchParams;
  const kopieraFranId = typeof searchParams.kopieraFran === "string" ? searchParams.kopieraFran : null;
  const kopieraFran = kopieraFranId ? await prisma.case.findUnique({ where: { id: kopieraFranId } }) : null;
  let kopieradKarta = null;
  try {
    kopieradKarta = kopieraFran?.karta ? JSON.parse(kopieraFran.karta) : null;
  } catch {
    kopieradKarta = null;
  }

  const taUsers = await prisma.user.findMany({ where: { role: "TA" }, orderBy: { name: "asc" } });
  const activeCounts = await prisma.case.groupBy({
    by: ["tilldeladTAId"],
    where: { status: { not: "AVSLUTAT" }, tilldeladTAId: { not: null } },
    _count: true,
  });
  const countFor = (id: string) => activeCounts.find((c) => c.tilldeladTAId === id)?._count ?? 0;

  return (
    <>
      <div className="topbar">
        <h1>Nytt ärende</h1>
        <span className="crumb">BUKO Sverige / Nytt ärende</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <h2>Skapa nytt ärende</h2>
              <p>Fyll i uppgifterna nedan. Du kan tilldela en TA-plansritare direkt eller göra det senare.</p>
            </div>
          </div>

          {kopieraFran && (
            <div className="hint" style={{ marginBottom: 14 }}>
              Kopierar från <strong>{kopieraFran.id} – {kopieraFran.titel}</strong>. Det nya ärendet kommer
              automatiskt kopplas ihop med det som en etapp/fas av samma projekt.
            </div>
          )}

          <div className="card card-pad" style={{ maxWidth: 720 }}>
            <form action={createCase}>
              {kopieraFran && <input type="hidden" name="kopieradFran" value={kopieraFran.id} />}
              <div className="form-row">
                <div className="form-group">
                  <label>Kund</label>
                  <input type="text" name="kund" placeholder="T.ex. Norrköpings kommun" defaultValue={kopieraFran?.kund} required />
                </div>
                <div className="form-group">
                  <label>Titel</label>
                  <input
                    type="text"
                    name="titel"
                    placeholder="T.ex. Ledningsarbete Storgatan"
                    defaultValue={kopieraFran?.titel}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Jobbnummer</label>
                  <input
                    type="text"
                    name="jobbnummer"
                    placeholder="T.ex. J-2026-0142"
                    defaultValue={kopieraFran?.jobbnummer ?? undefined}
                  />
                </div>
                <div className="form-group">
                  <label>Adress / plats</label>
                  <input type="text" name="adress" placeholder="Gata, ort" defaultValue={kopieraFran?.adress} required />
                </div>
              </div>

              <div className="form-group">
                <label>Region</label>
                <select name="region" required defaultValue={kopieraFran?.region ?? ""}>
                  <option value="" disabled>
                    Välj region...
                  </option>
                  {Object.entries(REGION_META).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Beskrivning</label>
                <textarea
                  name="beskrivning"
                  placeholder="Beskriv arbetet och vad TA-planen behöver täcka..."
                  defaultValue={kopieraFran?.beskrivning}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Sista dag för färdigställande</label>
                  <input type="date" name="deadline" />
                </div>
                <div className="form-group">
                  <label>Svårighetsgrad</label>
                  <select name="svarighetsgrad" defaultValue={kopieraFran?.svarighetsgrad ?? "MEDEL"}>
                    <option value="LATT">Lätt</option>
                    <option value="MEDEL">Medel</option>
                    <option value="SVAR">Svår</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tilldela TA-plansritare</label>
                <select name="tilldeladTA" defaultValue="">
                  <option value="">Ej tilldelad ännu</option>
                  {taUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {countFor(u.id)} pågående {countFor(u.id) === 1 ? "ärende" : "ärenden"}
                    </option>
                  ))}
                </select>
                <div className="hint">Kan även tilldelas senare från ärendesidan.</div>
              </div>

              <div className="form-group">
                <label>Arbetsområde – typskiss i kartvy</label>
                <SketchMap name="karta" editable initialValue={kopieradKarta} />
                <div className="hint">
                  Klicka på markörsymbolen för att markera adressen, rita linjer/polygoner/rektanglar/cirklar för att
                  skissa arbetsområdet, välj färg för att visa olika saker (t.ex. röd = avstängning, blå = gångväg),
                  eller lägg till textetiketter för tydlighet. TA-plansritaren ser skissen på ärendet.
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Skapa ärende
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
