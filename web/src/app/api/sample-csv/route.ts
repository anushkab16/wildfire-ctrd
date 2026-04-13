import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const filePath = path.resolve(process.cwd(), "..", "Algerian_forest_fires_dataset.csv");
    const csv = await readFile(filePath, "utf8");
    return NextResponse.json({ csvText: csv });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not load sample dataset", details: String(error) },
      { status: 500 },
    );
  }
}
