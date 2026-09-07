// Speglar STATUS_META / SEVERITY_META / REGION_META i den statiska prototypens app.js.
// Håll dessa i synk om nya statusar/värden läggs till där.

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  PL: "Projektledare",
  TA: "TA-plansritare",
};

export const STATUS_META: Record<string, { label: string; badge: string }> = {
  NY: { label: "Nytt ärende", badge: "badge-ny" },
  HOS_TA: { label: "Hos TA-plansritare", badge: "badge-hos_ta" },
  TA_KLAR: { label: "TA-plan klar – hos PL", badge: "badge-ta_klar" },
  TILLSTAND_SOKT: { label: "Tillstånd sökt", badge: "badge-tillstand_sokt" },
  TILLSTAND_AVSLAG: { label: "Tillstånd avslaget", badge: "badge-tillstand_avslag" },
  TILLSTAND_BEVILJAT: { label: "Tillstånd beviljat", badge: "badge-tillstand_beviljat" },
  AVSLUTAT: { label: "Avslutat", badge: "badge-avslutat" },
};

export const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  LATT: { label: "Lätt", color: "#3fb87f", bg: "rgba(63, 184, 127, 0.14)" },
  MEDEL: { label: "Medel", color: "#f0973d", bg: "rgba(240, 151, 61, 0.14)" },
  SVAR: { label: "Svår", color: "#f16a5d", bg: "rgba(241, 106, 93, 0.14)" },
};

export const REGION_META: Record<string, string> = {
  NORD: "Nord",
  MITT: "Mitt",
  EAST: "East",
  VAST: "Väst",
  SYD: "Syd",
};

export const STATUS_COLOR: Record<string, string> = {
  NY: "#5b9df5",
  HOS_TA: "#f0973d",
  TA_KLAR: "#a78bfa",
  TILLSTAND_SOKT: "#f0973d",
  TILLSTAND_AVSLAG: "#f16a5d",
  TILLSTAND_BEVILJAT: "#3fb87f",
  AVSLUTAT: "#8b93a7",
};

export const STATUS_ORDER = [
  "NY",
  "HOS_TA",
  "TA_KLAR",
  "TILLSTAND_SOKT",
  "TILLSTAND_AVSLAG",
  "TILLSTAND_BEVILJAT",
  "AVSLUTAT",
];

export function formatBytes(n: number) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("sv-SE", { day: "2-digit", month: "short", year: "numeric" });
}
