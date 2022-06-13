import {
  Estimate,
  MichelsonMap,
  OriginationOperation,
  Signer,
  TezosToolkit,
  TransactionOperation,
} from "@taquito/taquito";
import { char2Bytes, tzip16, Tzip16Module } from "@taquito/tzip16";
import { validateContractAddress, ValidationResult } from "@taquito/utils";
import { expect } from "chai";
import { Bitstring } from "./bitstring";
import code from "./contract/contract.json";

const MIN_LENGTH = 16384;

const rpc =
  process.env.TEZOS_RPC || process.env.VUE_APP_TEZOS_RPC || "localhost:8080";

const tezosToolkit = new TezosToolkit(rpc);
tezosToolkit.addExtension(new Tzip16Module());

const metadata = new MichelsonMap();
metadata.set(
  "",
  char2Bytes("https://static.gravity.earth/json/status-manager-metadata.json")
);

/**
 * @todo `issued`
 * @todo `proof`
 */
export async function resolve(id: string): Promise<any> {
  const [scheme, address] = id.split("://");

  if (scheme !== "slist") throw new Error("URI scheme should be 'slist'");

  const instance = await tezosToolkit.contract.at(address, tzip16);
  const views = await instance.tzip16().metadataViews();
  const { getOwner, getPurpose, getList } = views;
  const owner: string = await getOwner().executeView();
  const purpose: string = await getPurpose().executeView();
  const list: string = await getList().executeView();
  const res: any = {};

  res["@context"] = [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1",
  ];
  res.id = id;
  res.type = ["VerifiableCredential", "StatusList2021Credential"];
  res.issuer = `did:pkh:tz:${owner}`;
  res.credentialSubject = {
    id: `${id}#list`,
    type: "StatusList2021",
    statusPurpose: purpose,
    encodedList: list,
  };

  return res;
}

export async function estimateOriginate(
  signer: Signer,
  purpose: "revocation" | "suspension",
  size: number = MIN_LENGTH
): Promise<Estimate> {
  expect(size).to.be.a("number").and.to.be.greaterThanOrEqual(MIN_LENGTH);

  const owner = await signer.publicKeyHash();
  const value = new Uint8Array(size);
  const bitstring = new Bitstring(value);
  const list = bitstring.toBase64();
  const storage = { owner, metadata, list, purpose };

  tezosToolkit.setSignerProvider(signer);

  return tezosToolkit.estimate.originate({ code, storage });
}

export async function originate(
  signer: Signer,
  purpose: "revocation" | "suspension",
  size: number = MIN_LENGTH
): Promise<OriginationOperation> {
  expect(size).to.be.a("number").and.to.be.greaterThanOrEqual(MIN_LENGTH);

  const owner = await signer.publicKeyHash();
  const value = new Uint8Array(size);
  const bitstring = new Bitstring(value);
  const list = bitstring.toBase64();
  const storage = { owner, metadata, list, purpose };

  tezosToolkit.setSignerProvider(signer);
  const operation = await tezosToolkit.contract.originate({ code, storage });
  await operation.confirmation(3);

  if (!operation.contractAddress) throw new Error("Contract not deployed");

  return operation;
}

function validateVC(vc: any): {
  address: string;
  index: number;
  purpose: string;
} {
  expect(vc).to.be.an("object").and.to.have.property("credentialStatus");
  const { credentialStatus } = vc;

  expect(credentialStatus)
    .to.be.an("object")
    .and.to.have.keys(
      "id",
      "type",
      "statusPurpose",
      "statusListIndex",
      "statusListCredential"
    );
  const {
    id,
    type,
    statusPurpose,
    statusListIndex,
    statusListCredential,
  }: {
    id: string;
    type: string;
    statusPurpose: string;
    statusListIndex: string;
    statusListCredential: string;
  } = credentialStatus;

  expect(id)
    .to.be.a("string")
    .and.to.equals(`${statusListCredential}#${statusListIndex}`);
  expect(type).to.be.a("string").and.to.equal("StatusList2021Entry");
  expect(statusPurpose)
    .to.be.a("string")
    .and.to.satisfy((str: string): boolean => {
      const purposes = ["revocation", "suspension"];

      return purposes.includes(str);
    });
  expect(statusListIndex)
    .to.be.a("string")
    .and.to.satisfy((str: string): boolean => {
      function filterInt(value: string): number {
        if (/^[-+]?(\d+|Infinity)$/.test(value)) {
          return Number(value);
        } else {
          return NaN;
        }
      }

      const n = filterInt(str);

      if (!isFinite(n)) return false;

      return n >= 0;
    });
  expect(statusListCredential)
    .to.be.a("string")
    .and.to.satisfy((str: string): boolean => {
      if (!str.startsWith("slist://")) return false;

      const address = str.substring(8);

      return validateContractAddress(address) === ValidationResult.VALID;
    });

  const index = parseInt(statusListIndex);
  const address = statusListCredential.substring(8);
  const purpose = statusPurpose;

  return { address, index, purpose };
}

export async function revoke(
  signer: Signer,
  vcs: Array<any>
): Promise<TransactionOperation> {
  expect(vcs).to.be.instanceOf(Array).and.to.not.be.empty;

  tezosToolkit.setSignerProvider(signer);

  const arr = vcs.map((vc) => validateVC(vc));
  const { address } = arr[0];
  const test = arr.every((o) => o.address === address);

  if (!test) throw new Error("Status lists must be the same");

  const instance = await tezosToolkit.contract.at(address, tzip16);
  const rlvc = await resolve(vcs[0].credentialStatus.statusListCredential);
  const {
    credentialSubject: { encodedList, statusPurpose },
  } = rlvc;

  expect(statusPurpose).to.be.a("string").and.to.equal("revocation");

  const bitstring = Bitstring.fromBase64(encodedList);

  for (const o of arr) bitstring.turnOn(o.index);

  const list = bitstring.toBase64();
  const operation = await instance.methods.default(list).send();
  await operation.confirmation(3);

  return operation;
}

export async function suspend(
  signer: Signer,
  vcs: Array<any>
): Promise<TransactionOperation> {
  expect(vcs).to.be.instanceOf(Array).and.to.not.be.empty;

  tezosToolkit.setSignerProvider(signer);

  const arr = vcs.map((vc) => validateVC(vc));
  const { address } = arr[0];
  const test = arr.every((o) => o.address === address);

  if (!test) throw new Error("Status lists must be the same");

  const instance = await tezosToolkit.contract.at(address, tzip16);
  const rlvc = await resolve(vcs[0].credentialStatus.statusListCredential);
  const {
    credentialSubject: { encodedList, statusPurpose },
  } = rlvc;

  expect(statusPurpose).to.be.a("string").and.to.equal("suspension");

  const bitstring = Bitstring.fromBase64(encodedList);

  for (const o of arr) bitstring.turnOn(o.index);

  const list = bitstring.toBase64();
  const operation = await instance.methods.default(list).send();
  await operation.confirmation(3);

  return operation;
}

export async function unsuspend(
  signer: Signer,
  vcs: Array<any>
): Promise<TransactionOperation> {
  expect(vcs).to.be.instanceOf(Array).and.to.not.be.empty;

  tezosToolkit.setSignerProvider(signer);

  const arr = vcs.map((vc) => validateVC(vc));
  const { address } = arr[0];
  const test = arr.every((o) => o.address === address);

  if (!test) throw new Error("Status lists must be the same");

  const instance = await tezosToolkit.contract.at(address, tzip16);
  const rlvc = await resolve(vcs[0].credentialStatus.statusListCredential);
  const {
    credentialSubject: { encodedList, statusPurpose },
  } = rlvc;

  expect(statusPurpose).to.be.a("string").and.to.equal("suspension");

  const bitstring = Bitstring.fromBase64(encodedList);

  for (const o of arr) bitstring.turnOff(o.index);

  const list = bitstring.toBase64();
  const operation = await instance.methods.default(list).send();
  await operation.confirmation(3);

  return operation;
}

export async function isRevoked(vc: any): Promise<boolean> {
  const { index, purpose } = validateVC(vc);

  const rlvc = await resolve(vc.credentialStatus.statusListCredential);
  const {
    credentialSubject: { encodedList, statusPurpose },
  } = rlvc;

  expect(purpose)
    .to.be.a("string")
    .and.to.equal(statusPurpose)
    .and.to.equal("revocation");

  const bitstring = Bitstring.fromBase64(encodedList);

  return bitstring.getPosition(index);
}

export async function isSuspended(vc: any): Promise<boolean> {
  const { index, purpose } = validateVC(vc);

  const rlvc = await resolve(vc.credentialStatus.statusListCredential);
  const {
    credentialSubject: { encodedList, statusPurpose },
  } = rlvc;

  expect(purpose)
    .to.be.a("string")
    .and.to.equal(statusPurpose)
    .and.to.equal("suspension");

  const bitstring = Bitstring.fromBase64(encodedList);

  return bitstring.getPosition(index);
}
