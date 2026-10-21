import { describe, expect, it } from 'vitest';
import { appBasePath, authRedirectUrl } from './deployment';

describe('deployment paths', () => {
  it('preserves root deployments', () => expect(appBasePath('/')).toBe('/'));
  it('normalizes a path deployment', () => expect(appBasePath('/sota/')).toBe('/sota'));
  it('returns to the deployed app after authentication', () => {
    expect(authRedirectUrl('https://example.com', '/sota/')).toBe('https://example.com/sota/');
  });
});
