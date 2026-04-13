import { NextResponse } from "next/server";

import { addWatchlist, listWatchlists, updateWatchlistEnabled } from "@/lib/store/watchlists";

export async function GET() {
  const watchlists = await listWatchlists();
  return NextResponse.json({ watchlists });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.name || !body?.region) {
      return NextResponse.json({ error: "name and region are required" }, { status: 400 });
    }
    const watchlist = await addWatchlist({
      name: String(body.name),
      region: {
        latitude: Number(body.region.latitude),
        longitude: Number(body.region.longitude),
        radiusKm: Number(body.region.radiusKm ?? 30),
      },
      thresholds: {
        yellow: Number(body.thresholds?.yellow ?? 0.35),
        orange: Number(body.thresholds?.orange ?? 0.55),
        red: Number(body.thresholds?.red ?? 0.75),
        critical: Number(body.thresholds?.critical ?? 0.85),
      },
      channels: {
        emails: Array.isArray(body.channels?.emails) ? body.channels.emails : [],
        telegramChatIds: Array.isArray(body.channels?.telegramChatIds)
          ? body.channels.telegramChatIds
          : [],
      },
      enabled: Boolean(body.enabled ?? true),
    });
    return NextResponse.json({ watchlist }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create watchlist", details: String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updated = await updateWatchlistEnabled(String(body.id), Boolean(body.enabled));
    if (!updated) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }
    return NextResponse.json({ watchlist: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update watchlist", details: String(error) },
      { status: 500 },
    );
  }
}

