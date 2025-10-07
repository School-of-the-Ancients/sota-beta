const SECRET_STORAGE_PREFIX = 'sota-ancients-api-secret:';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return typeof window !== 'undefined' && window.btoa
    ? window.btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
};

const base64ToBuffer = (value: string): ArrayBuffer => {
  const binary = typeof window !== 'undefined' && window.atob
    ? window.atob(value)
    : Buffer.from(value, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const getCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto;
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
    return (globalThis as any).crypto as Crypto;
  }

  throw new Error('SubtleCrypto is not available in this environment.');
};

const loadKeyMaterial = async (userId: string): Promise<CryptoKey> => {
  const crypto = getCrypto();
  if (!crypto.subtle) {
    throw new Error('SubtleCrypto is unavailable.');
  }

  if (typeof localStorage === 'undefined') {
    throw new Error('Local storage is not available.');
  }

  const storageKey = `${SECRET_STORAGE_PREFIX}${userId}`;
  let secret = localStorage.getItem(storageKey);
  if (!secret) {
    const rawSecret = new Uint8Array(32);
    crypto.getRandomValues(rawSecret);
    secret = bufferToBase64(rawSecret.buffer);
    localStorage.setItem(storageKey, secret);
  }

  const raw = base64ToBuffer(secret);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

export const encryptForUser = async (userId: string, plaintext: string): Promise<string> => {
  const crypto = getCrypto();
  if (!crypto.subtle) {
    throw new Error('SubtleCrypto is unavailable.');
  }

  const key = await loadKeyMaterial(userId);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encoded = textEncoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const payload = new Uint8Array(iv.byteLength + encrypted.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(encrypted), iv.byteLength);

  return bufferToBase64(payload.buffer);
};

export const decryptForUser = async (userId: string, payload: string): Promise<string | null> => {
  try {
    const crypto = getCrypto();
    if (!crypto.subtle) {
      throw new Error('SubtleCrypto is unavailable.');
    }

    const key = await loadKeyMaterial(userId);
    const rawPayload = new Uint8Array(base64ToBuffer(payload));
    const iv = rawPayload.slice(0, 12);
    const ciphertext = rawPayload.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return textDecoder.decode(decrypted);
  } catch (error) {
    console.warn('Failed to decrypt user secret', error);
    return null;
  }
};

export const clearEncryptionKeyForUser = (userId: string) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  const storageKey = `${SECRET_STORAGE_PREFIX}${userId}`;
  localStorage.removeItem(storageKey);
};
