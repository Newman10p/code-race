/**
 * Client-side end-to-end encryption for private conversations.
 *
 * Honest description of what this is:
 *  - ECDH on P-256 for key agreement + AES-256-GCM for message encryption
 *    (WebCrypto only, no external dependency).
 *  - Your private key is generated in the browser and never leaves the device;
 *    only the public key is uploaded. The server stores ciphertext + IV only.
 *  - This is NOT the Signal Protocol: there is no double ratchet and therefore
 *    no forward secrecy per message. Never label it "Signal encrypted".
 */

const STORE_PREFIX = "coderace.e2ee.priv.";

type Jwk = JsonWebKey;

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function fingerprint(pub: Jwk): Promise<string> {
  const raw = new TextEncoder().encode(`${pub.x}.${pub.y}`);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ")
    .toUpperCase();
}

/** Loads this device's keypair, generating + persisting one on first use. */
export async function ensureDeviceKeys(userId: string): Promise<{ publicKey: Jwk; privateKey: CryptoKey; fp: string }> {
  const storeKey = STORE_PREFIX + userId;
  const existing = typeof localStorage !== "undefined" ? localStorage.getItem(storeKey) : null;

  if (existing) {
    const parsed = JSON.parse(existing) as { pub: Jwk; priv: Jwk };
    const privateKey = await crypto.subtle.importKey("jwk", parsed.priv, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
    return { publicKey: parsed.pub, privateKey, fp: await fingerprint(parsed.pub) };
  }

  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const pub = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as Jwk;
  const priv = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as Jwk;
  localStorage.setItem(storeKey, JSON.stringify({ pub, priv }));
  return { publicKey: pub, privateKey: pair.privateKey, fp: await fingerprint(pub) };
}

export function hasDeviceKeys(userId: string): boolean {
  return typeof localStorage !== "undefined" && !!localStorage.getItem(STORE_PREFIX + userId);
}

export function exportDeviceKeyBundle(userId: string): string | null {
  return typeof localStorage !== "undefined" ? localStorage.getItem(STORE_PREFIX + userId) : null;
}

export function importDeviceKeyBundle(userId: string, bundle: string) {
  JSON.parse(bundle); // validate
  localStorage.setItem(STORE_PREFIX + userId, bundle);
}

async function sharedKey(myPrivate: CryptoKey, theirPublic: Jwk): Promise<CryptoKey> {
  const pub = await crypto.subtle.importKey("jwk", theirPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: pub },
    myPrivate,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMessage(myPrivate: CryptoKey, theirPublic: Jwk, plaintext: string) {
  const key = await sharedKey(myPrivate, theirPublic);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { ciphertext: b64(ct), iv: b64(iv.buffer) };
}

export async function decryptMessage(myPrivate: CryptoKey, theirPublic: Jwk, ciphertext: string, iv: string) {
  try {
    const key = await sharedKey(myPrivate, theirPublic);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ciphertext));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}