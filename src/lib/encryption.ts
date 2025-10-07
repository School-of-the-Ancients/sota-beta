export const API_KEY_SECRET_STORAGE_PREFIX = 'school-of-the-ancients-api-secret:';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBuffer = (value: string): ArrayBuffer => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const ensureCrypto = () => {
  const crypto = globalThis.crypto;
  if (!crypto || !crypto.subtle) {
    throw new Error('Secure storage is not supported in this browser.');
  }
  return crypto;
};

const importAesKey = async (raw: ArrayBuffer) => {
  const crypto = ensureCrypto();
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
};

const getStorageKey = (userId: string) => `${API_KEY_SECRET_STORAGE_PREFIX}${userId}`;

export const clearStoredSecret = (userId: string) => {
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.warn('Failed to clear API key secret from storage', error);
  }
};

const getOrCreateRawSecret = (userId: string): ArrayBuffer => {
  const storageKey = getStorageKey(userId);
  const crypto = ensureCrypto();
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch (error) {
    console.warn('Unable to access localStorage for API key secret', error);
  }

  if (stored) {
    try {
      return base64ToBuffer(stored);
    } catch (error) {
      console.warn('Invalid stored API key secret. Regenerating.', error);
    }
  }

  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const encoded = bufferToBase64(randomBytes.buffer);
  try {
    localStorage.setItem(storageKey, encoded);
  } catch (error) {
    console.warn('Failed to persist API key secret. Encryption may be unavailable.', error);
  }
  return randomBytes.buffer;
};

const getSecretKey = async (userId: string) => {
  const rawSecret = getOrCreateRawSecret(userId);
  return importAesKey(rawSecret);
};

export const encryptApiKeyForUser = async (userId: string, apiKey: string) => {
  const crypto = ensureCrypto();
  const secretKey = await getSecretKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = textEncoder.encode(apiKey);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, secretKey, payload);
  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
  };
};

export const decryptApiKeyForUser = async (userId: string, ciphertext: string, iv: string) => {
  const crypto = ensureCrypto();
  const secretKey = await getSecretKey(userId);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(iv) },
    secretKey,
    base64ToBuffer(ciphertext)
  );
  return textDecoder.decode(decrypted);
};
