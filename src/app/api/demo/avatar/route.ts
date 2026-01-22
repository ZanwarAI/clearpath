import { NextResponse } from "next/server";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const cache = new Map<string, { expires: number; data: unknown }>();

const fallbackAvatar = (seed: string) =>
  `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(seed)}`;

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
  const seed = searchParams.get("seed")?.trim() || "demo";

  const cacheKey = `avatar:${seed}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const response = await fetch(
      `https://randomuser.me/api/?seed=${encodeURIComponent(seed)}&inc=picture&noinfo`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      throw new Error("RandomUser lookup failed");
    }

    const data = await response.json();
    const url = data?.results?.[0]?.picture?.thumbnail || fallbackAvatar(seed);
    const payload = { url };
    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch {
    const payload = { url: fallbackAvatar(seed) };
    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  }
}
