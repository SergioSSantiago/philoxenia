/**
 * Client-side E2E sealing for Philoxenia chat (Phase A).
 * Private keys never leave the browser. API only stores ciphertext.
 *
 * Full STRK20 pool ECDH / viewing-key discovery is Phase C
 * (see PRIVATE_MESSAGING_PLAN.md).
 *
 * Format (v1 dual-recipient so sender can re-read):
 *   phx1.<ivR>.<cipherR>.<ephSpki>.<ivS>.<cipherS>
 * Legacy single-recipient (4 parts) still decrypts for the recipient only.
 */

const ALGO = "ECDH";
const CURVE = "P-256";
const AES = "AES-GCM";
const SEALED_PREFIX = "phx1";

type StoredKeys = { privateJwk: string; publicSpki: string };

function storageKey(wallet: string) {
  return `philoxenia_msg_priv_${wallet.toLowerCase()}`;
}

function b64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function exportPublicSpki(key: CryptoKey): Promise<string> {
  return b64u(await crypto.subtle.exportKey("spki", key));
}

async function importPublicSpki(spkiB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    fromB64u(spkiB64).buffer as ArrayBuffer,
    { name: ALGO, namedCurve: CURVE },
    true,
    []
  );
}

async function exportPrivateJwk(key: CryptoKey): Promise<string> {
  return JSON.stringify(await crypto.subtle.exportKey("jwk", key));
}

async function importPrivateJwk(jwkJson: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkJson) as JsonWebKey,
    { name: ALGO, namedCurve: CURVE },
    true,
    ["deriveKey", "deriveBits"]
  );
}

function readStored(walletAddress: string): StoredKeys | null {
  const raw = localStorage.getItem(storageKey(walletAddress));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredKeys;
  } catch {
    return null;
  }
}

async function encryptTo(
  ephPrivate: CryptoKey,
  recipientPublic: CryptoKey,
  plaintext: string
): Promise<{ iv: string; cipher: string }> {
  const aesKey = await crypto.subtle.deriveKey(
    { name: ALGO, public: recipientPublic },
    ephPrivate,
    { name: AES, length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: AES, iv: iv as BufferSource },
    aesKey,
    new TextEncoder().encode(plaintext)
  );
  return { iv: b64u(iv), cipher: b64u(cipher) };
}

async function decryptFrom(
  myPrivate: CryptoKey,
  ephPublic: CryptoKey,
  ivB64: string,
  cipherB64: string
): Promise<string | null> {
  try {
    const aesKey = await crypto.subtle.deriveKey(
      { name: ALGO, public: ephPublic },
      myPrivate,
      { name: AES, length: 256 },
      false,
      ["decrypt"]
    );
    const plain = await crypto.subtle.decrypt(
      { name: AES, iv: fromB64u(ivB64) as BufferSource },
      aesKey,
      fromB64u(cipherB64).buffer as ArrayBuffer
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Ensure a local keypair exists; returns SPKI public key (base64url). */
export async function ensureMessageKeyPair(
  walletAddress: string
): Promise<string> {
  if (typeof window === "undefined" || !walletAddress) {
    throw new Error("Wallet required for sealed messaging");
  }
  const existing = readStored(walletAddress);
  if (existing?.publicSpki && existing?.privateJwk) {
    return existing.publicSpki;
  }

  const pair = await crypto.subtle.generateKey(
    { name: ALGO, namedCurve: CURVE },
    true,
    ["deriveKey", "deriveBits"]
  );
  const publicSpki = await exportPublicSpki(pair.publicKey);
  const privateJwk = await exportPrivateJwk(pair.privateKey);
  localStorage.setItem(
    storageKey(walletAddress),
    JSON.stringify({ privateJwk, publicSpki } satisfies StoredKeys)
  );
  return publicSpki;
}

export function isSealedBody(body: string): boolean {
  return body.startsWith(`${SEALED_PREFIX}.`);
}

/** Max plaintext length so dual ciphertext stays under API body limit. */
export const SEALED_PLAINTEXT_MAX = 900;

export async function sealMessage(
  walletAddress: string,
  recipientPublicSpki: string,
  plaintext: string
): Promise<string> {
  const stored = readStored(walletAddress);
  if (!stored) throw new Error("Generate your sealed-message keys first");
  if (plaintext.length > SEALED_PLAINTEXT_MAX) {
    throw new Error(`Message must be at most ${SEALED_PLAINTEXT_MAX} characters`);
  }

  const theirPub = await importPublicSpki(recipientPublicSpki);
  const myPub = await importPublicSpki(stored.publicSpki);

  const eph = await crypto.subtle.generateKey(
    { name: ALGO, namedCurve: CURVE },
    true,
    ["deriveKey", "deriveBits"]
  );
  const ephPub = await exportPublicSpki(eph.publicKey);

  const toThem = await encryptTo(eph.privateKey, theirPub, plaintext);
  const toSelf = await encryptTo(eph.privateKey, myPub, plaintext);

  return [
    SEALED_PREFIX,
    toThem.iv,
    toThem.cipher,
    ephPub,
    toSelf.iv,
    toSelf.cipher,
  ].join(".");
}

export async function unsealMessage(
  walletAddress: string,
  sealed: string
): Promise<string | null> {
  if (!isSealedBody(sealed)) return sealed;
  const parts = sealed.split(".");
  if (parts[0] !== SEALED_PREFIX) return null;

  const stored = readStored(walletAddress);
  if (!stored) return null;
  const myPriv = await importPrivateJwk(stored.privateJwk);

  // Dual: phx1.ivR.cR.eph.ivS.cS
  if (parts.length === 6) {
    const ephPub = await importPublicSpki(parts[3]);
    const a = await decryptFrom(myPriv, ephPub, parts[1], parts[2]);
    if (a !== null) return a;
    return decryptFrom(myPriv, ephPub, parts[4], parts[5]);
  }

  // Legacy single: phx1.iv.c.eph
  if (parts.length === 4) {
    const ephPub = await importPublicSpki(parts[3]);
    return decryptFrom(myPriv, ephPub, parts[1], parts[2]);
  }

  return null;
}

/** Preview helper for thread lists — never throws. */
export async function previewBody(
  walletAddress: string | undefined,
  body: string | undefined | null
): Promise<string> {
  if (!body) return "";
  if (!isSealedBody(body)) return body;
  if (!walletAddress) return "Sealed message";
  const plain = await unsealMessage(walletAddress, body);
  return plain ?? "Sealed message";
}
