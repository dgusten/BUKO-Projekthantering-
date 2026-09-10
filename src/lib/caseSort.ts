import { STATUS_ORDER } from "@/lib/meta";

export const CASE_SORTS: Record<string, (a: any, b: any) => number> = {
  uppdaterad: (a, b) => +new Date(b.uppdaterad) - +new Date(a.uppdaterad),
  status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  deadline: (a, b) => +new Date(a.deadline ?? "9999-12-31") - +new Date(b.deadline ?? "9999-12-31"),
  titel: (a, b) => a.titel.localeCompare(b.titel, "sv"),
};

export const CASE_SORT_OPTIONS = [
  { value: "uppdaterad", label: "Senast uppdaterad" },
  { value: "status", label: "Status" },
  { value: "deadline", label: "Deadline (närmast först)" },
  { value: "titel", label: "Titel (A–Ö)" },
];
