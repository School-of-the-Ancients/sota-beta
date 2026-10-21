/// <reference types="vite/client" />

export const appBasePath = (base = import.meta.env.BASE_URL || '/'): string => {
  if (!base.startsWith('/') || base.startsWith('//')) {
    throw new Error('The application base must be a same-origin path.');
  }
  return base.replace(/\/+$/, '') || '/';
};

export const authRedirectUrl = (origin: string, base = import.meta.env.BASE_URL || '/'): string => {
  const path = appBasePath(base);
  return new URL(path === '/' ? '/' : path + '/', origin).href;
};
