import { createHash } from "node:crypto";

const TIMESTAMP_WINDOW_MS = 60_000;
const DIFFICULTY_BITS = 14;

export interface PowResult {
  ok: boolean;
  reason?: string;
}

export function verifyPow(
  episodeId: unknown,
  timestamp: unknown,
  nonce: unknown,
  work: unknown,
): PowResult {
  if (typeof episodeId !== "string" || episodeId.length === 0 || episodeId.length > 128) {
    return { ok: false, reason: "invalid episodeId" };
  }
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return { ok: false, reason: "invalid timestamp" };
  }
  if (Math.abs(Date.now() - timestamp) > TIMESTAMP_WINDOW_MS) {
    return { ok: false, reason: "stale timestamp" };
  }
  if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 64) {
    return { ok: false, reason: "invalid nonce" };
  }
  if (typeof work !== "string" || work.length === 0 || work.length > 32) {
    return { ok: false, reason: "invalid work" };
  }

  const input = `${episodeId}:${timestamp}:${nonce}:${work}`;
  const hash = createHash("sha256").update(input).digest();
  if (leadingZeroBits(hash) < DIFFICULTY_BITS) {
    return { ok: false, reason: "insufficient work" };
  }
  return { ok: true };
}

function leadingZeroBits(buf: Buffer): number {
  let bits = 0;
  for (const byte of buf) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}
