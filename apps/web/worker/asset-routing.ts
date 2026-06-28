/**
 * Predicate for the static-assets Worker: is `pathname` an immutable build-asset
 * path? Every file Vite emits under `dist/assets/` is content-hash-named and
 * therefore immutable, so its absence always warrants a real 404 rather than the
 * SPA `index.html` fallback.
 *
 * Expects an already-normalized pathname (the handler derives it from
 * `new URL(request.url).pathname`, which collapses `..` segments). Case-sensitive
 * because the module loader only ever requests the exact lowercase emitted path.
 */

const ASSET_PREFIX = '/assets/';

export function isImmutableAssetPath(pathname: string): boolean {
  return pathname.startsWith(ASSET_PREFIX) && pathname.length > ASSET_PREFIX.length;
}
