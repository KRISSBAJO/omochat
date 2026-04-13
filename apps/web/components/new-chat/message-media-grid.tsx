"use client";

import { Download, ExternalLink, Radio } from "lucide-react";
import type { ChatMessage } from "../../lib/api-client";
import {
  attachmentFileName,
  attachmentIconForMime,
  attachmentKindLabel,
  formatDuration,
  formatFileSize
} from "./shared";

export function MessageMediaGrid({ media }: { media: ChatMessage["media"] }) {
  const gridClassName =
    media.length > 1
      ? "mb-3 inline-grid max-w-[200px] grid-cols-2 gap-2 sm:max-w-[300px]"
      : "mb-3 inline-grid max-w-[200px] grid-cols-1 gap-2 sm:max-w-[300px]";

  return (
    <div className={gridClassName}>
      {media.map((asset) => {
        const fileName = attachmentFileName(asset);
        const sizeLabel = formatFileSize(asset.sizeBytes);

        if (asset.mimeType.startsWith("image/")) {
          return (
            <div className="overflow-hidden rounded-[18px] border border-charcoal/10 bg-[#faf7f2]" key={asset.id}>
              <a href={asset.url} rel="noreferrer" target="_blank">
                <div className="flex max-h-[240px] min-h-[160px] items-center justify-center bg-[#f1ece3]">
                  <img
                    alt={fileName}
                    className="max-h-[240px] w-full object-contain transition hover:scale-[1.01]"
                    loading="lazy"
                    src={asset.url}
                  />
                </div>
              </a>
              <div className="flex items-center justify-between gap-3 border-t border-charcoal/8 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{fileName}</p>
                  <p className="mt-1 text-xs text-graphite/62">
                    Image {asset.width && asset.height ? `- ${asset.width}x${asset.height}` : ""} - {sizeLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    href={asset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    download={fileName}
                    href={asset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        }

        if (asset.mimeType.startsWith("video/")) {
          return (
            <div className="overflow-hidden rounded-[18px] border border-charcoal/10 bg-[#faf7f2]" key={asset.id}>
              <div className="flex max-h-[260px] min-h-[180px] items-center justify-center bg-black/10">
                <video className="max-h-[260px] w-full object-contain" controls src={asset.url} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-charcoal/8 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{fileName}</p>
                  <p className="mt-1 text-xs text-graphite/62">
                    Video {asset.durationMs ? `- ${formatDuration(asset.durationMs)}` : ""} - {sizeLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    href={asset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    download={fileName}
                    href={asset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        }

        if (asset.mimeType.startsWith("audio/")) {
          return (
            <div className="rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4" key={asset.id}>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-charcoal shadow-[0_8px_20px_rgba(24,18,15,0.05)]">
                  <Radio className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-charcoal">{fileName}</p>
                  <p className="mt-1 text-xs text-graphite/62">
                    Audio {asset.durationMs ? `- ${formatDuration(asset.durationMs)}` : ""} - {sizeLabel}
                  </p>
                </div>
                <a
                  className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                  download={fileName}
                  href={asset.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
              <audio className="mt-4 w-full" controls src={asset.url} />
            </div>
          );
        }

        const FileIcon = attachmentIconForMime(asset.mimeType, fileName);

        return (
          <div
            className="flex items-center justify-between gap-3 rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4"
            key={asset.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-charcoal shadow-[0_8px_20px_rgba(24,18,15,0.05)]">
                <FileIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">{fileName}</p>
                <p className="mt-1 text-xs text-graphite/62">
                  {attachmentKindLabel(asset.mimeType, fileName)} - {sizeLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                href={asset.url}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                download={fileName}
                href={asset.url}
                rel="noreferrer"
                target="_blank"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
