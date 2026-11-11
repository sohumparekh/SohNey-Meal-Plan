// Shared household login: one passcode (env HOUSEHOLD_PASSCODE), remembered on each
// phone with a signed cookie for a year. No email links, which matters on iPhone where
// a Home Screen app does not share cookies with Safari.
// Works in both the Edge (middleware) and Node runtimes via Web Crypto.

export const COOKIE = "hh_session";
export const MAX_AGE = 60 * 60 * 24 * 365;

const enc = new TextEncoder();

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ characters)");
  return s;
}

/** Token = issuedAt.signature. Changing SESSION_SECRET logs every phone out. */
export async function makeToken(now = Date.now()) {
  const issued = String(now);
  return `${issued}.${await hmac(secret(), issued)}`;
}

export async function verifyToken(token: string | undefined) {
  if (!token) return false;
  const [issued, sig] = token.split(".");
  if (!issued || !sig) return false;
  const expected = await hmac(secret(), issued);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 && Date.now() - Number(issued) < MAX_AGE * 1000;
}

export function passcodeMatches(input: string) {
  const expected = process.env.HOUSEHOLD_PASSCODE;
  if (!expected) return false;
  const a = input.trim(), b = expected.trim();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function cronAuthorized(req: Request) {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  const h = req.headers.get("authorization");
  return h === `Bearer ${s}`;
}
