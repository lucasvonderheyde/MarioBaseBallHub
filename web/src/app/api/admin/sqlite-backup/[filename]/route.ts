import fs from "fs";
import { NextResponse } from "next/server";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { resolveDbPath } from "@/db/resolve-db-path";
import { resolveBackupFile } from "@/db/sqlite-backup";

type Params = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !userIsSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filename } = await params;
  const backupPath = resolveBackupFile(resolveDbPath(), filename);
  if (!backupPath) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  const body = fs.readFileSync(backupPath);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
