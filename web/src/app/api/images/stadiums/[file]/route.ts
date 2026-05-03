import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const BASE = path.join(process.cwd(), "..", "Images", "StadiumIcons");

export async function GET(
  _req: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  const safe = path.basename(file);
  if (safe !== file || !safe.endsWith(".png")) {
    return new NextResponse("Bad request", { status: 400 });
  }
  const full = path.join(BASE, safe);
  if (!full.startsWith(BASE)) {
    return new NextResponse("Bad request", { status: 400 });
  }
  try {
    const buf = await fs.readFile(full);
    return new NextResponse(buf, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
