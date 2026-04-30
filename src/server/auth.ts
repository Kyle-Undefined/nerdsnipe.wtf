import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";

const DATA_DIR = join(import.meta.dir, "../../data");
const SECRET_PATH = join(DATA_DIR, ".cookie-secret");
const COOKIE_NAME = "vid";
const ONE_YEAR_SECS = 60 * 60 * 24 * 365;

let _secret: string | null = null;

export function getCookieSecret(): string {
  if (_secret) return _secret;

  const fromEnv = process.env.COOKIE_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    _secret = fromEnv;
    return _secret;
  }

  if (existsSync(SECRET_PATH)) {
    _secret = readFileSync(SECRET_PATH, "utf-8").trim();
    if (_secret.length >= 32) return _secret;
  }

  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const generated = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  writeFileSync(SECRET_PATH, generated, { mode: 0o600 });
  _secret = generated;
  return generated;
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

export async function readVoterId(c: Context): Promise<string | null> {
  const secret = getCookieSecret();
  const existing = await getSignedCookie(c, secret, COOKIE_NAME);
  return typeof existing === "string" && existing.length > 0 ? existing : null;
}
