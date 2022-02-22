export function uint8ArrayEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  for (let i in a) if (a[i] !== b[i]) return false;

  return true;
}
