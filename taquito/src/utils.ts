import base64url from "base64url";
import pako from "pako";

const MIN_LENGTH = 16384;

export function numberToUint8Array(n: number, length: number): Uint8Array {
  const res = new Uint8Array(length);
  let i = length;
  while (n) {
    res.set([n | (2 ** 8)], --i);
    n >>= 8;
  }

  return res;
}

export function uint8ArrayToNumber(ui8a: Uint8Array): number {
  const length = ui8a.length;
  const buffer = Buffer.from(ui8a);
  const result = buffer.readUIntBE(0, length);

  return result;
}

export function numberToEncodedList(
  n: number,
  length: number = MIN_LENGTH
): string {
  if (length < MIN_LENGTH)
    throw new Error(`List must be at least ${MIN_LENGTH} long`);

  const ui8a = numberToUint8Array(n, length);
  const compressed = pako.gzip(ui8a);
  const encoded = base64url.encode(Buffer.from(compressed));

  return encoded;
}

export function encodedListToNumber(encoded: string): number {
  const buffer = base64url.toBuffer(encoded);
  const value = pako.ungzip(buffer);
  const n = uint8ArrayToNumber(value);

  return n;
}
