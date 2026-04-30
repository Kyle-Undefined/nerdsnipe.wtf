// must match server/pow.ts
const DIFFICULTY_BITS = 14;
const MAX_ITERATIONS = 10_000_000;

const encoder = new TextEncoder();

export interface PowProof {
  timestamp: number;
  nonce: string;
  work: string;
}

export async function computePow(episodeId: string): Promise<PowProof> {
  const timestamp = Date.now();
  const nonceBuf = new Uint8Array(16);
  crypto.getRandomValues(nonceBuf);
  const nonce = bufToHex(nonceBuf);

  for (let work = 0; work < MAX_ITERATIONS; work++) {
    const input = `${episodeId}:${timestamp}:${nonce}:${work}`;
    const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(input));
    if (leadingZeroBits(new Uint8Array(hashBuf)) >= DIFFICULTY_BITS) {
      return { timestamp, nonce, work: String(work) };
    }
  }
  throw new Error("pow gave up");
}

function leadingZeroBits(arr: Uint8Array): number {
  let bits = 0;
  for (const byte of arr) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
