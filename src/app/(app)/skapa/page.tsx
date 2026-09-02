import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { REGION_META } from "@/lib/meta";
import { createCase } from "@/app/actions";
import SketchMap from "@/components/SketchMap";

export default async function SkapaArendePage() {
  const user = await requireUser();
  if (user.role !== "PL" && user.role !== "ADMIN") redirect("/");

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

          <div className="card card-pad" style={{ maxWidth: 720 }}>
            <form action={createCase}>
              <div className="form-row">
                <div className="form-group">
                  <label>Kund</label>
                  <input type="text" name="kund" placeholder="T.ex. Norrköpings kommun" required />
                </div>
                <div className="form-group">
                  <label>Titel</label>
                  <input type="text" name="titel" placeholder="T.ex. Ledningsarbete Storgatan" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Jobbnummer</label>
                  <input type="text" name="jobbnummer" placeholder="T.ex. J-2026-0142" />
                </div>
                <div className="form-group">
                  <label>Adress / plats</label>
                  <input type="text" name="adress" placeholder="Gata, ort" required />
                </div>
              </div>

              <div className="form-group">
                <label>Region</label>
                <select name="region" required defaultValue="">
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
                <textarea name="beskrivning" placeholder="Beskriv arbetet och vad TA-planen behöver täcka..." required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Sista dag för färdigställande</label>
                  <input type="date" name="deadline" />
                </div>
                <div className="form-group">
                  <label>Svårighetsgrad</label>
                  <select name="svarighetsgrad" defaultValue="MEDEL">
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
                <SketchMap name="karta" editable />
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
