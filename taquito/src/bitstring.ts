import base64url from "base64url";
import pako from "pako";

/**
 * Class representing a Bitstring
 */
export class Bitstring {
  /**
   * List value
   */
  readonly value: Uint8Array;

  /**
   * Minimal position
   */
  private _minPosition: number;

  /**
   * Maximal position
   */
  private _maxPosition: number;

  /**
   * @description Build an instance
   *
   * @param {Uint8Array} value List value
   */
  constructor(value: Uint8Array) {
    this.value = value;
    this._minPosition = 0;
    this._maxPosition = value.length << 3;
  }

  /**
   * @description Set a bit to 1
   *
   * @param {number} position Bit position on the list
   *
   * @returns {this} This instance
   */
  turnOn(position: number): this {
    if (position < this._minPosition || position >= this._maxPosition)
      throw new Error("Out of range.");

    const index = position >> 3;
    const mask = 1 << (position & 0b111);

    this.value[index] |= mask;

    return this;
  }

  /**
   * @description Set a bit to 0
   *
   * @param {number} position Bit position on the list
   *
   * @returns {this} This instance
   */
  turnOff(position: number): this {
    if (position < this._minPosition || position >= this._maxPosition)
      throw new Error("Out of range.");

    const index = position >> 3;
    const mask = ~(1 << (position & 0b111));

    this.value[index] &= mask;

    return this;
  }

  /**
   * @description Get bit status
   *
   * @param {number} position Bit position on the list
   *
   * @returns {boolean} `true` if bit is set to 1, `false` if bit is set to 0
   */
  getPosition(position: number): boolean {
    if (position < this._minPosition || position >= this._maxPosition)
      throw new Error("Out of range");

    const index = position >> 3;
    const value = this.value[index] >> (position & 0b111);

    return !!(value & 1);
  }

  /**
   * @description Build a compressed base64 representation
   *
   * @returns Compressed base64 representation
   */
  toBase64(): string {
    const compressed = pako.gzip(this.value);
    const encoded = base64url.encode(Buffer.from(compressed));

    return encoded;
  }

  /**
   * @description Build an instance from a compressed base64 representation
   *
   * @param {string} encoded Compressed base64 representation
   *
   * @returns {Bitstring} Bitstring instance
   */
  static fromBase64(encoded: string): Bitstring {
    const buffer = base64url.toBuffer(encoded);
    const value = pako.ungzip(buffer);

    return new Bitstring(value);
  }
}
