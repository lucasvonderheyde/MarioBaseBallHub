"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  uploadStatsFormAction,
  type UploadStatsState,
} from "@/server/actions";

type UploadMode = "file" | "paste";

type Props = {
  gameId: string;
  leagueId: string;
  seasonId: string;
  compact?: boolean;
};

function UploadPlaceholder({ compact }: { compact: boolean }) {
  return (
    <div
      className={`rounded-md border border-zinc-800 bg-zinc-900/40 ${
        compact ? "h-24" : "h-32"
      }`}
      aria-hidden
    />
  );
}

export function GameStatsUploader({
  gameId,
  leagueId,
  seasonId,
  compact = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <UploadPlaceholder compact={compact} />;
  }

  return (
    <GameStatsUploaderForm
      gameId={gameId}
      leagueId={leagueId}
      seasonId={seasonId}
      compact={compact}
    />
  );
}

function GameStatsUploaderForm({
  gameId,
  leagueId,
  seasonId,
  compact = false,
}: Props) {
  const [state, action, pending] = useActionState(uploadStatsFormAction, null);
  const [mode, setMode] = useState<UploadMode>("file");
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onFileSelected(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    try {
      const text = await file.text();
      if (!text.trim()) {
        setFileError("File is empty.");
        return;
      }
      setJsonText(text);
      setFileName(file.name);
    } catch {
      setFileError("Could not read file.");
      setJsonText("");
      setFileName(null);
    }
  }

  function switchMode(next: UploadMode) {
    setMode(next);
    setFileError(null);
    if (next === "paste") {
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const canSubmit = jsonText.trim().length > 0 && !pending;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="leagueId" value={leagueId} />
      <input type="hidden" name="seasonId" value={seasonId} />

      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => switchMode("file")}
          className={
            mode === "file"
              ? "rounded bg-zinc-700 px-2 py-0.5 text-zinc-100"
              : "rounded px-2 py-0.5 text-zinc-500 hover:text-zinc-300"
          }
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => switchMode("paste")}
          className={
            mode === "paste"
              ? "rounded bg-zinc-700 px-2 py-0.5 text-zinc-100"
              : "rounded px-2 py-0.5 text-zinc-500 hover:text-zinc-300"
          }
        >
          Paste JSON
        </button>
      </div>

      {mode === "file" ? (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,text/json"
            className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-xs file:text-zinc-100"
            onChange={(e) => onFileSelected(e.target.files?.[0])}
          />
          {fileName ? (
            <p className="text-xs text-zinc-500">
              Ready: <span className="font-mono text-zinc-400">{fileName}</span>
            </p>
          ) : (
            <p className="text-xs text-zinc-600">
              Choose a decoded game JSON export from Mario Superstar Baseball.
            </p>
          )}
          {fileError ? <p className="text-xs text-red-400">{fileError}</p> : null}
        </div>
      ) : (
        <textarea
          name="json"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          required
          rows={compact ? 4 : 6}
          placeholder="Paste decoded game JSON…"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100"
        />
      )}

      {mode === "file" ? (
        <textarea name="json" value={jsonText} readOnly hidden aria-hidden tabIndex={-1} />
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="msb-btn-primary px-3 py-1 text-sm disabled:opacity-50"
      >
        {pending ? "Uploading…" : compact ? "Report game" : "Save stats to this game"}
      </button>

      <UploadResult state={state} />
    </form>
  );
}

function UploadResult({ state }: { state: UploadStatsState }) {
  if (!state) return null;
  if ("error" in state) {
    return (
      <>
        <p className="text-sm text-red-400">{state.error}</p>
        {state.warnings?.length ? (
          <ul className="list-inside list-disc text-sm text-amber-200">
            {state.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </>
    );
  }
  if ("ok" in state && state.ok) {
    return (
      <>
        <p className="text-sm text-emerald-400">Stats saved.</p>
        {state.warnings?.length ? (
          <ul className="list-inside list-disc text-sm text-amber-200">
            {state.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </>
    );
  }
  return null;
}

/** @deprecated Use GameStatsUploader */
export const UploadStatsForm = GameStatsUploader;
