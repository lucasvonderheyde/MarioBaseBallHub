"use client";

import { useActionState, useRef, useState } from "react";
import {
  uploadStatsBatchAction,
  type BatchUploadState,
} from "@/server/actions/stats-actions";

const MAX_FILES = 20;

export function BatchGameStatsUploader() {
  const [state, action, pending] = useActionState(uploadStatsBatchAction, null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const payloadRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadFiles(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0) {
      setSelectedCount(0);
      if (payloadRef.current) payloadRef.current.value = "";
      return;
    }
    setFileError(null);
    const files = [...fileList].filter((file) =>
      file.name.toLowerCase().endsWith(".json"),
    );
    if (files.length === 0) {
      setFileError("Add decoded JSON files only.");
      setSelectedCount(0);
      if (payloadRef.current) payloadRef.current.value = "";
      return;
    }
    if (files.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files per batch.`);
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

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    void loadFiles(event.dataTransfer.files);
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <form action={action} className="space-y-3">
        <input ref={payloadRef} type="hidden" name="batchPayload" defaultValue="" />
        <div
          role="button"
          tabIndex={0}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`cursor-pointer rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
            isDragging
              ? "border-amber-400 bg-amber-950/20"
              : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-500"
          }`}
        >
          <p className="text-sm font-medium text-zinc-200">
            Drag and drop JSON files here
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            or click to browse · up to {MAX_FILES} files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,text/json"
            multiple
            className="hidden"
            onChange={(e) => void loadFiles(e.target.files)}
          />
        </div>

        {selectedCount > 0 ? (
          <p className="text-xs text-zinc-500">{selectedCount} file(s) ready</p>
        ) : null}
        {fileError ? <p className="text-xs text-red-400">{fileError}</p> : null}

        <button
          type="submit"
          disabled={pending || selectedCount === 0}
          className="msb-btn-primary px-3 py-1 text-sm disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Add to lifetime stats"}
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
                ? `added${result.gameLabel ? ` (${result.gameLabel})` : ""}`
                : result.error}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
