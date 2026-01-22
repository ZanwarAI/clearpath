import { NextResponse } from "next/server";

const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const cache = new Map<string, { expires: number; data: unknown }>();

const fallbackFacts = {
  title: "Medication facts unavailable",
  indications: "No FDA label data found for this medication.",
  warnings: "Refer to payer guidelines and clinical evidence in the record.",
  highlights: [
    "Verify diagnosis alignment with treatment guidelines",
    "Document prior therapies and response",
    "Attach recent labs or imaging when relevant",
  ],
  source: "OpenFDA (fallback)",
};

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

function getField(value: string[] | undefined) {
  if (!value || value.length === 0) return "";
  return value[0].replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const drug = searchParams.get("drug")?.trim() || "";

  if (!drug) {
    return NextResponse.json({ facts: fallbackFacts });
  }

  const cacheKey = `openfda:${drug.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const search = `openfda.brand_name:"${drug}"+openfda.generic_name:"${drug}"`;
    const response = await fetch(
      `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(search)}&limit=1`,
      { next: { revalidate: 43200 } }
    );

    if (!response.ok) {
      throw new Error("OpenFDA lookup failed");
    }

    const data = await response.json();
    const result = data?.results?.[0] ?? {};
    const indications = getField(result.indications_and_usage);
    const warnings = getField(result.warnings) || getField(result.boxed_warning);
    const description = getField(result.description);
    const highlights = [
      indications ? `Indications: ${indications}` : null,
      warnings ? `Warnings: ${warnings}` : null,
      description ? `Summary: ${description}` : null,
    ].filter(Boolean) as string[];

    const payload = {
      facts: {
        title: `OpenFDA summary for ${drug}`,
        indications: indications || "No indications listed on label.",
        warnings: warnings || "No warnings listed on label.",
        highlights: highlights.length > 0 ? highlights.slice(0, 3) : fallbackFacts.highlights,
        source: "OpenFDA",
      },
    };

    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch {
    const payload = { facts: fallbackFacts };
    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  }
}
