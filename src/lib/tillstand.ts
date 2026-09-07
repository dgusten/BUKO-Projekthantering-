export type TillstandLike = {
  slutdatum: Date | string;
  paminnelseDagarInnan: number;
};

export function tillstandStatus(t: TillstandLike) {
  const daysLeft = Math.ceil((+new Date(t.slutdatum) - Date.now()) / 86400000);
  if (daysLeft < 0) return { label: "Utgånget", badge: "badge-tillstand_avslag", daysLeft };
  if (daysLeft <= t.paminnelseDagarInnan) return { label: "Löper snart ut", badge: "badge-tillstand_sokt", daysLeft };
  return { label: "Aktivt", badge: "badge-tillstand_beviljat", daysLeft };
}
