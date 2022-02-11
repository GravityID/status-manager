import { InMemorySigner } from "@taquito/signer";
import {
  OriginationOperation,
  Signer,
  TezosToolkit,
  TransactionOperation,
} from "@taquito/taquito";
import { tzip16, Tzip16Module } from "@taquito/tzip16";
import { Prefix } from "@taquito/utils";
import BigNumber from "bignumber.js";
import chai, { expect } from "chai";
import "dotenv/config";
import { RevocationManagerStorage } from "../src/interfaces";
import { originate, turnOff, turnOn } from "../src/originate";
import resolve from "../src/resolver";
import faker from "faker";

chai.use(require("chai-string"));
chai.use(require("chai-as-promised"));
chai.use(require("chai-arrays"));

const rpc =
  process.env.TEZOS_RPC || process.env.VUE_APP_TEZOS_RPC || "localhost:8080";

const tezosToolkit = new TezosToolkit(rpc);
tezosToolkit.addExtension(new Tzip16Module());

describe("Revocation Manager", function () {
  let address: string;
  let signer: Signer;

  before(async function () {
    if (!process.env.SIGNER_ADDRESS)
      throw new Error("Variable not set: SIGNER_ADDRESS");
    if (!process.env.SIGNER_PRIVATE)
      throw new Error("Variable not set: SIGNER_PRIVATE");

    signer = await InMemorySigner.fromSecretKey(process.env.SIGNER_PRIVATE);

    await expect(signer.publicKeyHash()).to.eventually.equal(
      process.env.SIGNER_ADDRESS
    );
  });

  describe("Methods", function () {
    describe("originate", function () {
      it("should successfully originate a contract", async function () {
        const op = await originate(signer);
        expect(op)
          .to.be.instanceOf(OriginationOperation)
          .and.to.have.property("contractAddress")
          .and.to.be.a("string")
          .and.to.startWith(Prefix.KT1);

        address = op.contractAddress!;
        const instance = await tezosToolkit.contract.at(address);
        const storage = await instance.storage<RevocationManagerStorage>();
        expect(storage)
          .to.be.an("object")
          .and.to.have.keys("owner", "metadata", "list");
        expect(storage.owner)
          .to.be.a("string")
          .and.to.equal(await signer.publicKeyHash());
        expect(storage.list)
          .to.be.instanceOf(BigNumber)
          .and.to.satisfy(storage.list.isZero.bind(storage.list));
      });
    });

    describe("turnOn", function () {
      it("should fail modifying the list from another sender", async function () {
        const key = "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq";
        const signer = await InMemorySigner.fromSecretKey(key);
        const index = faker.datatype.number({ min: 0, max: 256 });
        const p = turnOn(address, index, signer);

        await expect(p).to.eventually.be.rejectedWith("Unauthorized sender");
      });

      it("should fail modifying a list index that is less than 0", async function () {
        const index = faker.datatype.number({ min: -1000, max: -1 });
        const p = turnOn(address, index, signer);

        await expect(p).to.eventually.be.rejected;
      });

      it("should fail modifying a list index that is greater than 256", async function () {
        const index = faker.datatype.number({ min: 257, max: 1000 });
        const p = turnOn(address, index, signer);

        await expect(p).to.eventually.be.rejected;
      });

      it("should successfully modify the list", async function () {
        const index = faker.datatype.number({ min: 0, max: 256 });
        const op = await turnOn(address, index, signer);

        expect(op).to.be.instanceOf(TransactionOperation);
      });
    });

    describe("turnOff", function () {
      it("should fail modifying the list from another sender", async function () {
        const key = "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq";
        const signer = await InMemorySigner.fromSecretKey(key);
        const index = faker.datatype.number({ min: 0, max: 256 });
        const p = turnOff(address, index, signer);

        await expect(p).to.eventually.be.rejectedWith("Unauthorized sender");
      });

      it("should fail modifying a list index that is less than 0", async function () {
        const index = faker.datatype.number({ min: -1000, max: -1 });
        const p = turnOff(address, index, signer);

        await expect(p).to.eventually.be.rejected;
      });

      it("should fail modifying a list index that is greater than 256", async function () {
        const index = faker.datatype.number({ min: 257, max: 1000 });
        const p = turnOff(address, index, signer);

        await expect(p).to.eventually.be.rejected;
      });

      it("should successfully modify the list", async function () {
        const index = faker.datatype.number({ min: 0, max: 256 });
        const op = await turnOff(address, index, signer);

        expect(op).to.be.instanceOf(TransactionOperation);
      });
    });
  });

  describe("Views", function () {
    describe("getOwner", function () {
      it("should successfully use getOwner view to read the 'owner' property", async function () {
        const instance = await tezosToolkit.contract.at(address, tzip16);
        const storage = await instance.storage<RevocationManagerStorage>();

        const { getOwner } = await instance.tzip16().metadataViews();
        expect(getOwner).to.be.instanceOf(Function);

        const owner = await getOwner().executeView();
        expect(owner).to.be.a("string").and.to.equal(storage.owner);
      });
    });

    describe("getList", function () {
      it("should successfully use getList view to read the 'list' property", async function () {
        const instance = await tezosToolkit.contract.at(address, tzip16);
        const storage = await instance.storage<RevocationManagerStorage>();

        const { getList } = await instance.tzip16().metadataViews();
        expect(getList).to.be.instanceOf(Function);

        const list = await getList().executeView();
        expect(list)
          .to.be.instanceOf(BigNumber)
          .and.to.satisfy(storage.list.eq.bind(storage.list));
      });
    });

    describe("getValue", function () {
      it("should fail using getValue from an index that is less than 0", async function () {
        const instance = await tezosToolkit.contract.at(address, tzip16);
        const { getValue } = await instance.tzip16().metadataViews();
        expect(getValue).to.be.instanceOf(Function);

        const index = faker.datatype.number({ min: -1000, max: -1 });
        const p = getValue().executeView(index);

        await expect(p).to.eventually.be.rejected;
      });

      it("should fail using getValue from an index that is greater than 256", async function () {
        const instance = await tezosToolkit.contract.at(address, tzip16);
        const { getValue } = await instance.tzip16().metadataViews();
        expect(getValue).to.be.instanceOf(Function);

        const index = faker.datatype.number({ min: 257, max: 1000 });
        const p = getValue().executeView(index);

        await expect(p).to.eventually.be.rejected;
      });

      it("should successfully use getValue to read a binary value at a specific index", async function () {
        const instance = await tezosToolkit.contract.at(address, tzip16);
        const { getValue } = await instance.tzip16().metadataViews();
        expect(getValue).to.be.instanceOf(Function);

        const index = faker.datatype.number({ min: 0, max: 256 });
        const value = await getValue().executeView(index);

        expect(value).to.be.a("boolean");
      });
    });
  });

  describe("Resolver", function () {
    describe("Resolve", function () {
      it("should successfully resolve a RevocationList2020Credential", async function () {
        const id = `rlist://${address}`;
        const vc = await resolve(id);

        console.log(vc);

        expect(vc).to.be.an("object");
        expect(vc).to.have.keys(
          "@context",
          "id",
          "type",
          "issuer",
          "credentialSubject"
        );
        expect(vc["@context"])
          .to.be.instanceOf(Array)
          .and.to.equalTo([
            "https://www.w3.org/2018/credentials/v1",
            "https://w3id.org/vc-revocation-list-2020/v1",
          ]);
        expect(vc.id).to.be.a("string").and.to.equal(id);
        expect(vc.type)
          .to.be.instanceOf(Array)
          .and.to.equalTo([
            "VerifiableCredential",
            "RevocationList2020Credential",
          ]);
        expect(vc.issuer)
          .to.be.a("string")
          .and.to.equal(`did:pkh:tz:${await signer.publicKeyHash()}`);
        expect(vc.credentialSubject)
          .to.be.an("object")
          .and.to.have.keys("id", "type", "encodedList");
        expect(vc.credentialSubject.id)
          .to.be.a("string")
          .and.to.equal(`${id}#list`);
        expect(vc.credentialSubject.type)
          .to.be.a("string")
          .and.to.equal("RevocationList2020");
        expect(vc.credentialSubject.encodedList).to.be.a("string");
      });
    });
  });
});
