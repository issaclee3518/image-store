import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const JAMENDO_BASE = "https://api.jamendo.com/v3.0/tracks";

export async function GET(request: NextRequest) {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "JAMENDO_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim() || "music";
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const params = new URLSearchParams({
    client_id: clientId,
    format: "json",
    limit: String(limit),
    search: search,
  });

  try {
    const res = await fetch(`${JAMENDO_BASE}/?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Jamendo API error", details: text },
        { status: res.status }
      );
    }
    const data = (await res.json()) as {
      headers?: { status?: string };
      results?: Array<{
        id: string;
        name: string;
        duration: number;
        artist_name: string;
        album_name?: string;
        audio: string;
        audiodownload?: string;
        album_image?: string;
      }>;
    };
    const results = data.results ?? [];
    return NextResponse.json({
      tracks: results.map((t) => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        artist_name: t.artist_name,
        album_name: t.album_name ?? "",
        audio: t.audio,
        audiodownload: t.audiodownload,
        album_image: t.album_image,
      })),
    });
  } catch (err) {
    console.error("Jamendo API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 502 }
    );
  }
}
