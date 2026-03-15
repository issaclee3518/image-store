import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const JAMENDO_BASE = "https://api.jamendo.com/v3.0/tracks";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "JAMENDO_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const { trackId } = await params;
  if (!trackId) {
    return NextResponse.json({ error: "trackId required" }, { status: 400 });
  }

  try {
    const trackRes = await fetch(
      `${JAMENDO_BASE}/?client_id=${encodeURIComponent(clientId)}&format=json&limit=1&id=${encodeURIComponent(trackId)}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 3600 } }
    );
    if (!trackRes.ok) {
      return NextResponse.json(
        { error: "Failed to get track" },
        { status: trackRes.status }
      );
    }
    const trackData = (await trackRes.json()) as {
      results?: Array<{ audio?: string }>;
    };
    const audioUrl = trackData.results?.[0]?.audio;
    if (!audioUrl) {
      return NextResponse.json({ error: "Track or audio URL not found" }, { status: 404 });
    }

    const audioRes = await fetch(audioUrl, {
      headers: { Accept: "audio/mpeg, audio/*" },
      cache: "no-store",
    });
    if (!audioRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch audio stream" },
        { status: 502 }
      );
    }

    const contentType = audioRes.headers.get("content-type") ?? "audio/mpeg";
    const contentLength = audioRes.headers.get("content-length");
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    });
    if (contentLength) headers.set("Content-Length", contentLength);
    return new NextResponse(audioRes.body, { headers });
  } catch (err) {
    console.error("Jamendo audio proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch audio" },
      { status: 502 }
    );
  }
}
