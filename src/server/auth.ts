import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";

const DATA_DIR = join(import.meta.dir, "../../data");
const SECRET_PATH = join(DATA_DIR, ".cookie-secret");
const COOKIE_NAME = "vid";
const ONE_YEAR_SECS = 60 * 60 * 24 * 365;

let _secret: string | null = null;

function readSecretFile(): string | null {
  try {
    if (!existsSync(SECRET_PATH)) return null;
    const v = readFileSync(SECRET_PATH, "utf-8").trim();
    return v.length >= 32 ? v : null;
  } catch (err) {
    console.error("[auth] failed to read cookie secret:", err);
    return null;
  }
}

export function getCookieSecret(): string {
  if (_secret) return _secret;

  const fromEnv = process.env.COOKIE_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    _secret = fromEnv;
    return _secret;
  }

  const existing = readSecretFile();
  if (existing) {
    _secret = existing;
    return _secret;
  }

  // generate. ensure dir exists, then re-check the file in case another
  // process wrote it between our read and our write — first-writer wins so all
  // processes converge on the same secret.
  try {
    mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("[auth] failed to create data dir:", err);
    throw err;
  }

  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const generated = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");

  try {
    writeFileSync(SECRET_PATH, generated, { mode: 0o600, flag: "wx" });
    _secret = generated;
    return generated;
  } catch (err) {
    // EEXIST or other write race — re-read and use whatever is on disk
    const racey = readSecretFile();
    if (racey) {
      _secret = racey;
      return _secret;
    }
    console.error("[auth] failed to persist cookie secret:", err);
    throw err;
  }
}

export async function getOrSetVoterId(c: Context): Promise<string> {
  const secret = getCookieSecret();
  const existing = await getSignedCookie(c, secret, COOKIE_NAME);
  if (typeof existing === "string" && existing.length > 0) return existing;

  const newId = crypto.randomUUID();
  await setSignedCookie(c, COOKIE_NAME, newId, secret, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECS,
    path: "/",
  });
  return newId;
}
