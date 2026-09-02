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

export function mailtoReminder(opts: {
  caseId: string;
  titel: string;
  adress: string;
  kund: string;
  slutdatumLabel: string;
  plEmail: string | null;
  kundKontaktNamn: string | null;
  kundKontaktEmail: string | null;
}) {
  const to = [opts.plEmail, opts.kundKontaktEmail].filter(Boolean).join(",");
  const subject = encodeURIComponent(
    `Påminnelse: Tillstånd för ${opts.caseId} – ${opts.titel} löper ut ${opts.slutdatumLabel}`
  );
  const body = encodeURIComponent(
    `Hej,\n\nDetta är en påminnelse om att tillståndet för ärende ${opts.caseId} (${opts.titel}) på ${opts.adress} löper ut ${opts.slutdatumLabel}.\n\n` +
      `Kund: ${opts.kund}\nKontaktperson hos kund: ${opts.kundKontaktNamn ?? "-"}\n\n` +
      `Se över om förlängning eller vidare åtgärd behövs.\n\nMvh\nBUKO Sverige`
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
