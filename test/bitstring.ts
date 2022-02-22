import * as chai from "chai";
import { expect } from "chai";
import * as faker from "faker";
import { Bitstring } from "../src/bitstring";
import { uint8ArrayEquals } from "../src/utils";

chai.use(require("chai-arrays"));
chai.use(require("chai-as-promised"));

const iteration = process.env.ITERATION ? parseInt(process.env.ITERATION) : 100;

describe("Bitstring", function () {
  describe("constructor", function () {
    it("should successfully create an instance of Bitstring", function () {
      const value = new Uint8Array(faker.datatype.number()).map(() =>
        faker.datatype.number(0xff)
      );
      const bitstring = new Bitstring(value);

      expect(bitstring)
        .to.be.instanceOf(Bitstring)
        .and.to.have.property("value")
        .and.to.be.Uint8Array()
        .and.to.satisfy((ui8a: Uint8Array) => {
          return uint8ArrayEquals(value, ui8a);
        });
      expect(bitstring)
        .to.have.property("_minPosition")
        .and.to.be.a("number")
        .and.to.equal(0);
      expect(bitstring)
        .to.have.property("_maxPosition")
        .and.to.be.a("number")
        .and.to.equal(value.length << 3);
    });
  });

  describe("turnOn / getPosition", function () {
    let bitstrings: Array<Bitstring>;

    this.beforeEach(async function () {
      bitstrings = await Bitstring.fake(iteration);
    });

    it("should fail setting a bit to 1 (1/2)", function () {
      async function callback(): Promise<void> {
        const [bitstring] = await Bitstring.fake();
        const position = faker.datatype.number(-1);

        bitstring.turnOn(position);
      }

      return expect(callback()).to.eventually.be.rejectedWith("Out of range");
    });

    it("should fail setting a bit to 1 (2/2)", function () {
      async function callback(): Promise<void> {
        const [bitstring] = await Bitstring.fake();
        const position = faker.datatype.number({
          min: bitstring.value.length << 3,
          max: bitstring.value.length << 4,
        });

        bitstring.turnOn(position);
      }

      return expect(callback()).to.eventually.be.rejectedWith("Out of range");
    });

    it("should set a bit to 1", function () {
      for (let bitstring of bitstrings) {
        const position = faker.datatype.number(
          (bitstring.value.length << 3) - 1
        );

        expect(bitstring.turnOn(position)).to.equal(bitstring);
        expect(bitstring.getPosition(position)).to.be.true;
      }
    });
  });

  describe("turnOff / getPosition", function () {
    let bitstrings: Array<Bitstring>;

    this.beforeEach(async function () {
      bitstrings = await Bitstring.fake(iteration);
    });

    it("should fail setting a bit to 0 (1/2)", function () {
      async function callback(): Promise<void> {
        const [bitstring] = await Bitstring.fake();
        const position = faker.datatype.number(-1);

        bitstring.turnOff(position);
      }

      return expect(callback()).to.eventually.be.rejectedWith("Out of range");
    });

    it("should fail setting a bit to 0 (2/2)", function () {
      async function callback(): Promise<void> {
        const [bitstring] = await Bitstring.fake();
        const position = faker.datatype.number({
          min: bitstring.value.length << 3,
          max: bitstring.value.length << 4,
        });

        bitstring.turnOff(position);
      }

      return expect(callback()).to.eventually.be.rejectedWith("Out of range");
    });

    it("should set a bit to 0", function () {
      for (let bitstring of bitstrings) {
        const position = faker.datatype.number(
          (bitstring.value.length << 3) - 1
        );

        expect(bitstring.turnOff(position)).to.equal(bitstring);
        expect(bitstring.getPosition(position)).to.be.false;
      }
    });
  });

  describe("toBase64", function () {
    it("should successfully build a compressed base64 representation of a Bitstring", async function () {
      const bitstrings = await Bitstring.fake(iteration);

      for (let bitstring of bitstrings) {
        const b64 = bitstring.toBase64();

        expect(b64).to.be.a("string");
      }
    });
  });

  describe("toBase64 / fromBase64 / equals", function () {
    it("should maintain integrity over a Bitstring", async function () {
      const bitstrings = await Bitstring.fake(iteration);

      for (let bitstring of bitstrings) {
        const other = Bitstring.fromBase64(bitstring.toBase64());

        expect(other).to.satisfy(bitstring.equals.bind(bitstring));
        expect(other.toBase64()).to.deep.equal(bitstring.toBase64());
      }
    });
  });
});
