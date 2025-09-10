export type Factors = Record<string, Record<string, number>>;

export async function loadFactors(): Promise<Factors> {
  // easiest: put a copy at /public/data/emission_factors.json
  const res = await fetch("/data/emission_factors.json");
  return res.json();
}

export function computeTotalWithFactors(
  numeric: Record<string, number>,
  categoricals: Record<string, string>,
  factors: Factors
) {
  let total = 0;
  for (const val of Object.values(numeric)) total += Number(val || 0);
  for (const [k, v] of Object.entries(categoricals)) {
    const f = factors?.[k]?.[v];
    if (typeof f === "number") total += f;
  }
  return total;
}
