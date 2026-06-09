"use client";

import { useActionState, useRef, useState } from "react";
import {
  uploadStatsBatchAction,
  type BatchUploadState,
} from "@/server/actions/stats-actions";

type Props = {
  leagueId: string;
  seasonId: string;
  seasonLabel: string;
};

export function BatchGameStatsUploader({ leagueId, seasonId, seasonLabel }: Props) {
  const [state, action, pending] = useActionState(uploadStatsBatchAction, null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const payloadRef = useRef<HTMLInputElement>(null);

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      setSelectedCount(0);
      if (payloadRef.current) payloadRef.current.value = "";
      return;
    }
    setFileError(null);
    const files = [...fileList];
    if (files.length > 20) {
      setFileError("Maximum 20 files per batch.");
      return;
    }
    try {
      const payload = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          jsonText: await file.text(),
        })),
      );
      if (payloadRef.current) {
        payloadRef.current.value = JSON.stringify(payload);
      }
      setSelectedCount(files.length);
    } catch {
      setFileError("Could not read one or more files.");
      setSelectedCount(0);
      if (payloadRef.current) payloadRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="font-medium">{seasonLabel}</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Select multiple decoded JSON files. Each file is auto-matched to an
        unreported game in this season by netplay names — only use when you are
        confident every file belongs here. To report one matchup, use Season
        games instead.
      </p>
      <form action={action} className="mt-3 space-y-2">
        <input type="hidden" name="leagueId" value={leagueId} />
        <input type="hidden" name="seasonId" value={seasonId} />
        <input ref={payloadRef} type="hidden" name="batchPayload" defaultValue="" />
        <input
          type="file"
          accept=".json,application/json,text/json"
          multiple
          className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-xs file:text-zinc-100"
          onChange={(e) => onFilesSelected(e.target.files)}
        />
        {selectedCount > 0 ? (
          <p className="text-xs text-zinc-500">{selectedCount} file(s) ready</p>
        ) : null}
        {fileError ? <p className="text-xs text-red-400">{fileError}</p> : null}
        <button
          type="submit"
          disabled={pending || selectedCount === 0}
          className="msb-btn-primary px-3 py-1 text-sm disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload batch"}
        </button>
      </form>
      {state && "error" in state && state.error ? (
        <p className="mt-2 text-sm text-red-400">{state.error}</p>
      ) : null}
      {state && "ok" in state && state.results ? (
        <ul className="mt-3 space-y-1 text-sm">
          {state.results.map((result) => (
            <li
              key={result.fileName}
              className={result.ok ? "text-emerald-400" : "text-red-400"}
            >
              {result.fileName}:{" "}
              {result.ok
                ? `saved${result.gameLabel ? ` (${result.gameLabel})` : ""}`
                : result.error}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
