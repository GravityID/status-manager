import { InMemorySigner } from "@taquito/signer";
import {
  Estimate,
  OriginationOperation,
  Signer,
  TezosToolkit,
  TransactionOperation,
} from "@taquito/taquito";
import { Tzip16Module } from "@taquito/tzip16";
import { Prefix } from "@taquito/utils";
import chai, { expect } from "chai";
import "dotenv/config";
import faker from "faker";
import {
  estimateOriginate,
  isRevoked,
  isSuspended,
  originate,
  resolve,
  revoke,
  suspend,
  unsuspend,
} from "../src/index";
import { StatusManagerStorage } from "../src/interfaces";

chai.use(require("chai-string"));
chai.use(require("chai-as-promised"));
chai.use(require("chai-arrays"));

const rpc =
  process.env.TEZOS_RPC || process.env.VUE_APP_TEZOS_RPC || "localhost:8080";

const tezosToolkit = new TezosToolkit(rpc);
tezosToolkit.addExtension(new Tzip16Module());

describe("Status Manager", function () {
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

  describe("'revocation' purpose", function () {
    let address: string;
    const size = 16384;
    const purpose = "revocation";

    describe("originate", function () {
      it("should successfully originate a contract", async function () {
        const op = await originate(signer, purpose, size);
        expect(op)
          .to.be.instanceOf(OriginationOperation)
          .and.to.have.property("contractAddress")
          .and.to.be.a("string")
          .and.to.startWith(Prefix.KT1);

        address = op.contractAddress!;
        const instance = await tezosToolkit.contract.at(address);
        const storage = await instance.storage<StatusManagerStorage>();
        expect(storage)
          .to.be.an("object")
          .and.to.have.keys("list", "metadata", "owner", "purpose");
        expect(storage.owner)
          .to.be.a("string")
          .and.to.equal(await signer.publicKeyHash());
        expect(storage.list).to.be.a("string");
        expect(storage.purpose).to.be.a("string").and.to.equal(purpose);
      });
    });

    describe("estimateOriginate", function () {
      it("should successfully estimate a contract origination", async function () {
        const estimate = await estimateOriginate(signer, purpose, size);
        expect(estimate)
          .to.be.an("object")
          .and.to.satisfy((estimate: Estimate): boolean => {
            return estimate.totalCost > 0;
          });
      });
    });

    describe("resolve", function () {
      it("should successfully resolve a StatusList2021Credential", async function () {
        const id = `slist://${address}`;
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
            "https://w3id.org/vc/status-list/2021/v1",
          ]);
        expect(vc.id).to.be.a("string").and.to.equal(id);
        expect(vc.type)
          .to.be.instanceOf(Array)
          .and.to.equalTo(["VerifiableCredential", "StatusList2021Credential"]);
        expect(vc.issuer)
          .to.be.a("string")
          .and.to.equal(`did:pkh:tz:${await signer.publicKeyHash()}`);
        expect(vc.credentialSubject)
          .to.be.an("object")
          .and.to.have.keys("id", "type", "statusPurpose", "encodedList");
        expect(vc.credentialSubject.id)
          .to.be.a("string")
          .and.to.equal(`${id}#list`);
        expect(vc.credentialSubject.type)
          .to.be.a("string")
          .and.to.equal("StatusList2021");
        expect(vc.credentialSubject.encodedList).to.be.a("string");
        expect(vc.credentialSubject.statusPurpose)
          .to.be.a("string")
          .and.to.equal(purpose);
      });
    });

    describe("revoke / isRevoked", function () {
      let statusListCredential: string;
      let statusListIndex: string;
      let vc: any;

      before(function () {
        statusListCredential = `slist://${address}`;
        statusListIndex = faker.datatype.number(size).toString();
        vc = {
          "@context": "https://www.w3.org/2018/credentials/v1",
          id: faker.internet.url(),
          credentialStatus: {
            id: `${statusListCredential}#${statusListIndex}`,
            type: "StatusList2021Entry",
            statusPurpose: purpose,
            statusListIndex: statusListIndex,
            statusListCredential,
          },
        };
      });

      it("should successfully declare a credential non-revoked", async function () {
        const revoked = await isRevoked(vc);
        expect(revoked).to.be.a("boolean").and.to.be.false;
      });

      it("should successfully revoke a credential", async function () {
        const op = await revoke(signer, [vc]);
        expect(op).to.be.instanceOf(TransactionOperation);
      });

      it("should successfully declare a credential revoked", async function () {
        const revoked = await isRevoked(vc);
        expect(revoked).to.be.a("boolean").and.to.be.true;
      });
    });
  });

  describe("'suspension' purpose", function () {
    let address: string;
    const size = 16384;
    const purpose = "suspension";

    describe("originate", function () {
      it("should successfully originate a contract", async function () {
        const op = await originate(signer, purpose, size);
        expect(op)
          .to.be.instanceOf(OriginationOperation)
          .and.to.have.property("contractAddress")
          .and.to.be.a("string")
          .and.to.startWith(Prefix.KT1);

        address = op.contractAddress!;
        const instance = await tezosToolkit.contract.at(address);
        const storage = await instance.storage<StatusManagerStorage>();
        expect(storage)
          .to.be.an("object")
          .and.to.have.keys("list", "metadata", "owner", "purpose");
        expect(storage.owner)
          .to.be.a("string")
          .and.to.equal(await signer.publicKeyHash());
        expect(storage.list).to.be.a("string");
        expect(storage.purpose).to.be.a("string").and.to.equal(purpose);
      });
    });

    describe("estimateOriginate", function () {
      it("should successfully estimate a contract origination", async function () {
        const estimate = await estimateOriginate(signer, purpose, size);
        expect(estimate)
          .to.be.an("object")
          .and.to.satisfy((estimate: Estimate): boolean => {
            return estimate.totalCost > 0;
          });
      });
    });

    describe("resolve", function () {
      it("should successfully resolve a StatusList2021Credential", async function () {
        const id = `slist://${address}`;
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
            "https://w3id.org/vc/status-list/2021/v1",
          ]);
        expect(vc.id).to.be.a("string").and.to.equal(id);
        expect(vc.type)
          .to.be.instanceOf(Array)
          .and.to.equalTo(["VerifiableCredential", "StatusList2021Credential"]);
        expect(vc.issuer)
          .to.be.a("string")
          .and.to.equal(`did:pkh:tz:${await signer.publicKeyHash()}`);
        expect(vc.credentialSubject)
          .to.be.an("object")
          .and.to.have.keys("id", "type", "statusPurpose", "encodedList");
        expect(vc.credentialSubject.id)
          .to.be.a("string")
          .and.to.equal(`${id}#list`);
        expect(vc.credentialSubject.type)
          .to.be.a("string")
          .and.to.equal("StatusList2021");
        expect(vc.credentialSubject.encodedList).to.be.a("string");
        expect(vc.credentialSubject.statusPurpose)
          .to.be.a("string")
          .and.to.equal(purpose);
      });
    });

    describe("suspend / unsuspend / isSuspended", function () {
      let statusListCredential: string;
      let statusListIndex: string;
      let vc: any;

      before(function () {
        statusListCredential = `slist://${address}`;
        statusListIndex = faker.datatype.number(size).toString();
        vc = {
          "@context": "https://www.w3.org/2018/credentials/v1",
          id: faker.internet.url(),
          credentialStatus: {
            id: `${statusListCredential}#${statusListIndex}`,
            type: "StatusList2021Entry",
            statusPurpose: purpose,
            statusListIndex: statusListIndex,
            statusListCredential,
          },
        };
      });

      it("should successfully declare a credential non-suspended", async function () {
        const suspended = await isSuspended(vc);
        expect(suspended).to.be.a("boolean").and.to.be.false;
      });

      it("should successfully suspend a credential", async function () {
        const op = await suspend(signer, [vc]);
        expect(op).to.be.instanceOf(TransactionOperation);
      });

      it("should successfully declare a credential suspended", async function () {
        const suspended = await isSuspended(vc);
        expect(suspended).to.be.a("boolean").and.to.be.true;
      });

      it("should successfully unsuspend a credential", async function () {
        const op = await unsuspend(signer, [vc]);
        expect(op).to.be.instanceOf(TransactionOperation);
      });

      it("should successfully declare a credential non-suspended", async function () {
        const suspended = await isSuspended(vc);
        expect(suspended).to.be.a("boolean").and.to.be.false;
      });
    });
  });
});
