import type { EncryptedSecret } from '../../types';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const SALT = 'sota-beta-user-api-key';

const getCrypto = (): Crypto => {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef || !cryptoRef.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  return cryptoRef;
};

const toUint8Array = (value: ArrayBuffer | Uint8Array): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value;
  }
  return new Uint8Array(value);
};

const bufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = toUint8Array(buffer);
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  throw new Error('Base64 encoding is not supported in this environment.');
};

const base64ToUint8Array = (value: string): Uint8Array => {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }

  throw new Error('Base64 decoding is not supported in this environment.');
};

const deriveKey = async (userId: string) => {
  const cryptoRef = getCrypto();
  const keyMaterial = await cryptoRef.subtle.importKey(
    'raw',
    textEncoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return cryptoRef.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(SALT),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptSecretForUser = async (
  userId: string,
  secret: string
): Promise<EncryptedSecret> => {
  const cryptoRef = getCrypto();
  const key = await deriveKey(userId);
  const iv = cryptoRef.getRandomValues(new Uint8Array(12));
  const ciphertext = await cryptoRef.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    textEncoder.encode(secret)
  );

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext),
  };
};

export const decryptSecretForUser = async (
  userId: string,
  payload: EncryptedSecret
): Promise<string> => {
  const cryptoRef = getCrypto();
  const key = await deriveKey(userId);
  const decrypted = await cryptoRef.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToUint8Array(payload.iv),
    },
    key,
    base64ToUint8Array(payload.ciphertext)
  );

  return textDecoder.decode(decrypted);
};
