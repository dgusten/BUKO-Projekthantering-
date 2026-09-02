type StatusLogEntry = { status: string; datum: Date };

// Summerar varje period ärendet legat i status HOS_TA (hanterar revideringsvarv
// där det skickas fram och tillbaka flera gånger).
export function drawTimeMs(statusLog: StatusLogEntry[]) {
  let totalMs = 0;
  let ongoingSinceMs: number | null = null;
  for (let i = 0; i < statusLog.length; i++) {
    if (statusLog[i].status !== "HOS_TA") continue;
    const start = +new Date(statusLog[i].datum);
    if (i + 1 < statusLog.length) {
      totalMs += +new Date(statusLog[i + 1].datum) - start;
    } else {
      ongoingSinceMs = start;
    }
  }
  return { totalMs, ongoingSinceMs };
}

export function reachedStatus(statusLog: StatusLogEntry[], status: string) {
  return statusLog.some((s) => s.status === status);
}

export function formatDuration(ms: number | null) {
  if (ms == null) return "–";
  const hours = ms / 3600000;
  if (hours < 24) return Math.round(hours * 10) / 10 + " h";
  return Math.round((hours / 24) * 10) / 10 + " dagar";
}

export function monthBuckets(dates: Date[], monthsBack: number) {
  const now = new Date();
  const buckets = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("sv-SE", { month: "short" }), count: 0 });
  }
  for (const date of dates) {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.count++;
  }
  return buckets;
}
