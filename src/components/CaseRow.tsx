import Link from "next/link";
import { STATUS_META, REGION_META, formatDate } from "@/lib/meta";
import type { SearchableCase } from "@/lib/caseSearch";

export default function CaseRow({
  c,
  daysInStatus,
}: {
  c: SearchableCase & { deadline: Date | string | null };
  daysInStatus?: number;
}) {
  const status = STATUS_META[c.status];
  return (
    <Link href={`/arende/${c.id}`} className="case-row">
      <div className="case-row-main">
        <div className="case-row-title">
          <span className="case-id">{c.id}</span> {c.titel}
        </div>
        <div className="case-row-meta">
          <span>📍 {c.adress}</span>
          <span>🧭 {c.region ? REGION_META[c.region] : "Ingen region"}</span>
          <span>👤 PL: {c.skapadAv.name}</span>
          <span>✏️ TA: {c.tilldeladTA?.name ?? "Ej tilldelad"}</span>
          <span>📅 {formatDate(c.deadline)}</span>
          {daysInStatus !== undefined && (
            <span>⏱️ {daysInStatus === 0 ? "Idag" : `${daysInStatus} ${daysInStatus === 1 ? "dag" : "dagar"}`} i detta steg</span>
          )}
        </div>
      </div>
      <div className="case-row-right">
        <span className={`badge ${status.badge}`}>
          <span className="dot" />
          {status.label}
        </span>
      </div>
    </Link>
  );
}
