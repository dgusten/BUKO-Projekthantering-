import { prisma } from "@/lib/prisma";

export default async function Home() {
  const cases = await prisma.case.findMany({
    orderBy: { uppdaterad: "desc" },
    include: { skapadAv: true, tilldeladTA: true },
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "40px auto", padding: "0 20px" }}>
      <h1>BUKO Sverige – Ärenden (från databasen)</h1>
      <p style={{ color: "#666" }}>
        Denna sida bevisar att hela kedjan fungerar: SQLite-databas → Prisma → Next.js server component.
        Detta är grunden för den riktiga appen — inte den slutgiltiga designen än.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th style={{ padding: 8 }}>Ärende</th>
            <th style={{ padding: 8 }}>Kund</th>
            <th style={{ padding: 8 }}>Jobbnummer</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>PL</th>
            <th style={{ padding: 8 }}>TA-plansritare</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>
                <strong>{c.id}</strong> — {c.titel}
              </td>
              <td style={{ padding: 8 }}>{c.kund}</td>
              <td style={{ padding: 8 }}>{c.jobbnummer || "–"}</td>
              <td style={{ padding: 8 }}>{c.status}</td>
              <td style={{ padding: 8 }}>{c.skapadAv.name}</td>
              <td style={{ padding: 8 }}>{c.tilldeladTA?.name ?? "Ej tilldelad"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
