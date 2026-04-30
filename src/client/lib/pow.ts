// must match server/pow.ts
const DIFFICULTY_BITS = 14;
const MAX_ITERATIONS = 10_000_000;
// yield to the event loop every YIELD_EVERY iterations so the main thread
// stays responsive while we hash. tuned to keep the longest synchronous run
// under ~16ms on a typical laptop at DIFFICULTY_BITS=14.
const YIELD_EVERY = 256;

const encoder = new TextEncoder();

export interface PowProof {
  timestamp: number;
  nonce: string;
  work: string;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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
    if ((work & (YIELD_EVERY - 1)) === YIELD_EVERY - 1) {
      await yieldToEventLoop();
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
