import { NextResponse } from "next/server";

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const cache = new Map<string, { expires: number; data: unknown }>();

const fallbackResults = [
  { code: "I10", description: "Essential (primary) hypertension" },
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
  { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
  { code: "M54.5", description: "Low back pain" },
  { code: "F41.1", description: "Generalized anxiety disorder" },
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

  const cacheKey = `icd10:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const response = await fetch(
      `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(query)}`,
      { next: { revalidate: 21600 } }
    );

    if (!response.ok) {
      throw new Error("ICD-10 lookup failed");
    }

    const data = await response.json();
    const pairs: Array<[string, string]> = Array.isArray(data?.[3]) ? data[3] : [];
    const codes: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    const names: string[] = Array.isArray(data?.[2]) ? data[2] : [];

    const results = pairs.length > 0
      ? pairs.slice(0, 8).map(([code, description]) => ({ code, description }))
      : codes.slice(0, 8).map((code, index) => ({
          code,
          description: names[index] || "",
        }));

    const payload = { results };
    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch {
    const payload = { results: fallbackResults };
    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  }
}
