import { InMemorySigner } from "@taquito/signer";
import {
  OriginationOperation,
  Signer,
  TezosToolkit,
  TransactionOperation,
} from "@taquito/taquito";
import { Estimate } from "@taquito/taquito/dist/types/contract/estimate";
import { Tzip16Module } from "@taquito/tzip16";
import { Prefix } from "@taquito/utils";
import chai, { expect } from "chai";
import "dotenv/config";
import faker from "faker";
import {
  estimateOriginate,
  originate,
  resolve,
  revoke,
  unrevoke,
} from "../src/index";
import { RevocationManagerStorage } from "../src/interfaces";

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
  const size = 16384;

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

  describe("originate", function () {
    it("should successfully originate a contract", async function () {
      const op = await originate(signer, size);
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
      expect(storage.list).to.be.a("string");
    });
  });

  describe("estimateOriginate", function () {
    it("should successfully estimate a contract origination", async function () {
      const estimate = await estimateOriginate(signer, size);
      expect(estimate)
        .to.be.an("object")
        .and.to.satisfy((estimate: Estimate): boolean => {
          return estimate.totalCost > 0;
        });
    });
  });

  describe("resolve", function () {
    it("should successfully resolve a RevocationList2020Credential", async function () {
      const id = `rlist://${address}`;
      const vc = await resolve(id);

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

  describe("revoke", function () {
    it("should successfully revoke a credential", async function () {
      const vc = {
        "@context": "https://www.w3.org/2018/credentials/v1",
        id: faker.internet.url(),
        credentialStatus: {
          id: faker.internet.url(),
          type: "RevocationList2020Status",
          revocationListIndex: faker.datatype.number(size).toString(),
          revocationListCredential: `rlist://${address}`,
        },
      };
      const op = await revoke(vc, signer);
      expect(op).to.be.instanceOf(TransactionOperation);
    });
  });

  describe("unrevoke", function () {
    it("should successfully unrevoke a credential", async function () {
      const vc = {
        "@context": "https://www.w3.org/2018/credentials/v1",
        id: faker.internet.url(),
        credentialStatus: {
          id: faker.internet.url(),
          type: "RevocationList2020Status",
          revocationListIndex: faker.datatype.number(size).toString(),
          revocationListCredential: `rlist://${address}`,
        },
      };
      const op = await unrevoke(vc, signer);
      expect(op).to.be.instanceOf(TransactionOperation);
    });
  });
});
