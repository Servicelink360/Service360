import React from "react";

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi|3gp|mpeg|mpg)(?:[?#].*)?$/i;

export function isFaultVideoUrl(value: unknown): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  try {
    return VIDEO_EXTENSIONS.test(new URL(raw, "https://example.invalid").pathname);
  } catch {
    return VIDEO_EXTENSIONS.test(raw);
  }
}

export const FaultMedia: React.FC<{
  url: string;
  width?: number | string;
  height?: number | string;
  controls?: boolean;
}> = ({ url, width = 88, height = 88, controls = true }) => (
  <video
    src={url}
    controls={controls}
    playsInline
    preload="metadata"
    style={{
      width,
      height,
      objectFit: "cover",
      display: "block",
      background: "#000",
      borderRadius: 4,
    }}
  />
);
