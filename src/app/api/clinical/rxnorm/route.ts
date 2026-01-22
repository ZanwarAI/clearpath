import { NextResponse } from "next/server";

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const cache = new Map<string, { expires: number; data: unknown }>();

const fallbackResults = [
  { code: "104922", name: "Lisinopril" },
  { code: "617314", name: "Metformin" },
  { code: "860975", name: "Atorvastatin" },
  { code: "197361", name: "Amoxicillin" },
  { code: "1091643", name: "Albuterol" },
];

function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry || entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = `rxnorm:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const response = await fetch(
      `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(query)}`,
      { next: { revalidate: 21600 } }
    );

    if (!response.ok) {
      throw new Error("RxNorm request failed");
    }

    const data = await response.json();
    const groups = data?.drugGroup?.conceptGroup ?? [];
    const results: Array<{ code: string; name: string }> = [];

    for (const group of groups) {
      const props = group?.conceptProperties ?? [];
      for (const prop of props) {
        if (prop?.rxcui && prop?.name) {
          results.push({ code: String(prop.rxcui), name: String(prop.name) });
        }
      }
    }

    const unique = Array.from(
      new Map(results.map((item) => [item.name.toLowerCase(), item])).values()
    ).slice(0, 8);

    const payload = { results: unique };
    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch {
    const payload = { results: fallbackResults };
    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  }
}
