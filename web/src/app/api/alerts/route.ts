import { NextResponse } from "next/server";

import { acknowledgeAlert, listAlerts } from "@/lib/store/alerts";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const alerts = await listAlerts(
    status as "triggered" | "delivered" | "acknowledged" | "failed" | undefined,
  );
  return NextResponse.json({ alerts });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updated = await acknowledgeAlert(String(body.id));
    if (!updated) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ alert: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update alert", details: String(error) },
      { status: 500 },
    );
  }
}

