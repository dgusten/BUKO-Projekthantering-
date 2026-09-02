import { REGION_META, STATUS_META, SEVERITY_META } from "./meta";

export type SearchableCase = {
  id: string;
  titel: string;
  kund: string;
  adress: string;
  jobbnummer: string | null;
  region: string | null;
  status: string;
  svarighetsgrad: string;
  skapadAv: { name: string };
  tilldeladTA: { name: string } | null;
};

export function caseSearchText(c: SearchableCase) {
  return [
    c.id,
    c.titel,
    c.kund,
    c.adress,
    c.jobbnummer ?? "",
    c.region ? REGION_META[c.region] : "",
    c.skapadAv.name,
    c.tilldeladTA?.name ?? "",
    STATUS_META[c.status]?.label ?? "",
    SEVERITY_META[c.svarighetsgrad]?.label ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function caseMatchesQuery(c: SearchableCase, query: string | undefined) {
  if (!query) return true;
  return caseSearchText(c).includes(query.trim().toLowerCase());
}
