import { NextResponse } from "next/server";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { exportLeagueBackup } from "@/lib/league-backup";

type Params = { params: Promise<{ leagueId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !userIsSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { leagueId } = await params;
  const backup = await exportLeagueBackup(leagueId);
  if (!backup) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const filename = `${backup.league.slug}-backup.json`;
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
