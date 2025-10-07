const DEVICE_SECRET_STORAGE_KEY = 'sota-device-secret';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fromBase64 = (value: string): ArrayBuffer => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const canUseBrowserCrypto = () => typeof window !== 'undefined' && Boolean(window.crypto?.subtle) && Boolean(window.localStorage);

const getOrCreateDeviceSecret = (): Uint8Array => {
  if (!canUseBrowserCrypto()) {
    throw new Error('Browser cryptography is not available.');
  }

  let secret = window.localStorage.getItem(DEVICE_SECRET_STORAGE_KEY);
  if (!secret) {
    const random = new Uint8Array(32);
    window.crypto.getRandomValues(random);
    secret = toBase64(random.buffer);
    window.localStorage.setItem(DEVICE_SECRET_STORAGE_KEY, secret);
    return random;
  }

  const buffer = fromBase64(secret);
  return new Uint8Array(buffer);
};

const getDeviceKey = async (): Promise<CryptoKey> => {
  const rawSecret = getOrCreateDeviceSecret();
  return window.crypto.subtle.importKey('raw', rawSecret, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

export interface EncryptedPayload {
  cipherText: string;
  iv: string;
}

export const encryptString = async (plainText: string): Promise<EncryptedPayload> => {
  if (!plainText) {
    throw new Error('Nothing to encrypt.');
  }

  if (!canUseBrowserCrypto()) {
    throw new Error('Browser cryptography is not available.');
  }

  const key = await getDeviceKey();
  const ivBytes = new Uint8Array(12);
  window.crypto.getRandomValues(ivBytes);
  const encoded = textEncoder.encode(plainText);
  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, encoded);
  return {
    cipherText: toBase64(encrypted),
    iv: toBase64(ivBytes.buffer),
  };
};

export const decryptString = async (cipherText: string, iv: string): Promise<string> => {
  if (!cipherText) {
    throw new Error('Nothing to decrypt.');
  }

  if (!canUseBrowserCrypto()) {
    throw new Error('Browser cryptography is not available.');
  }

  const key = await getDeviceKey();
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(fromBase64(iv)) },
    key,
    fromBase64(cipherText)
  );
  return textDecoder.decode(decrypted);
};

export const clearDeviceSecret = () => {
  if (!canUseBrowserCrypto()) {
    return;
  }
  window.localStorage.removeItem(DEVICE_SECRET_STORAGE_KEY);
};

export const isEncryptionAvailable = () => canUseBrowserCrypto();
