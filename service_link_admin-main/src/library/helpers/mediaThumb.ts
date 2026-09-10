import urlConfig from "@app/config/site.config";
import { isFaultVideoUrl } from "@app/components/report-faults/fault-media";

/** List/table thumbnail via API resize proxy — avoids downloading full S3 images in grids. */
export function mediaListThumbUrl(url: string, width = 88): string {
  const raw = String(url || "").trim();
  if (!raw || isFaultVideoUrl(raw) || raw.startsWith("data:")) return raw;
  const base = String(urlConfig.orderApiURL || "").replace(/\/+$/, "");
  if (!base) return raw;
  const w = Math.max(32, Math.min(320, Math.round(width) || 88));
  return `${base}/v1/image-thumb?url=${encodeURIComponent(raw)}&w=${w}`;
}
