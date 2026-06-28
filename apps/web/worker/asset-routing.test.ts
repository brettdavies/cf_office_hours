import { describe, it, expect } from 'vitest';
import { isImmutableAssetPath } from './asset-routing';

describe('isImmutableAssetPath', () => {
  it.each([
    '/assets/index-abc12345.js',
    '/assets/style-deadbeef.css',
    '/assets/logo-1234abcd.svg',
    '/assets/app.js.html',
  ])('returns true for an immutable build-asset path: %s', pathname => {
    expect(isImmutableAssetPath(pathname)).toBe(true);
  });

  it.each([
    '/dashboard',
    '/coordinator/matching',
    '/assets',
    '/assets/',
    '/my-assets/x.js',
    '/dashboard/assets',
    '/my-assets-overview',
    '/ASSETS/x.js',
  ])('returns false for a non-asset path: %s', pathname => {
    expect(isImmutableAssetPath(pathname)).toBe(false);
  });

  it('documents that traversal forms never reach the predicate (URL normalizes them)', () => {
    expect(new URL('https://host/assets/../index.html').pathname).toBe('/index.html');
  });
});
