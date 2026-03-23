// Shared bucket key helper — fixes duplication and Monday week start
const getBucketKey = (loggedAt, view) => {
  const date = new Date(loggedAt);

  if (view === "daily") {
    return date.toISOString().split("T")[0];
  }

  if (view === "weekly") {
    const d = new Date(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().split("T")[0];
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const aggregateMetrics = (logs, view, metric) => {
  if (!logs?.length) return [];

  const buckets = {};

  logs.forEach((log) => {
    if (log[metric] == null) return;

    const key = getBucketKey(log.loggedAt, view);

    if (!buckets[key]) buckets[key] = { values: [] };
    buckets[key].values.push(log[metric]);
  });

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { values }]) => ({
      date: key,
      key,
      avg: Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1)),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    }));
};

export const aggregateBloodPressure = (logs, view) => {
  if (!logs?.length) return [];

  const buckets = {};

  logs.forEach((log) => {
    if (log.systolicBP == null && log.diastolicBP == null) return;

    const key = getBucketKey(log.loggedAt, view);

    if (!buckets[key]) buckets[key] = { sys: [], dia: [] };
    if (log.systolicBP != null) buckets[key].sys.push(log.systolicBP);
    if (log.diastolicBP != null) buckets[key].dia.push(log.diastolicBP);
  });

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { sys, dia }]) => ({
      date: key,
      key,
      systolicBP: sys.length
        ? Number((sys.reduce((s, v) => s + v, 0) / sys.length).toFixed(1))
        : null,
      diastolicBP: dia.length
        ? Number((dia.reduce((s, v) => s + v, 0) / dia.length).toFixed(1))
        : null,
    }));
};