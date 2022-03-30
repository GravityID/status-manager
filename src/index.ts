import {
  MichelsonMap,
  OriginationOperation,
  Signer,
  TezosToolkit,
  TransactionOperation,
} from "@taquito/taquito";
import { Estimate } from "@taquito/taquito/dist/types/contract/estimate";
import { char2Bytes, tzip16, Tzip16Module } from "@taquito/tzip16";
import { validateContractAddress, ValidationResult } from "@taquito/utils";
import { expect } from "chai";
import { Bitstring } from "./bitstring";
import code from "./contract/contract.json";

const URL_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
const MIN_LENGTH = 16384;

const rpc =
  process.env.TEZOS_RPC || process.env.VUE_APP_TEZOS_RPC || "localhost:8080";

const tezosToolkit = new TezosToolkit(rpc);
tezosToolkit.addExtension(new Tzip16Module());

const metadata = new MichelsonMap();
metadata.set(
  "",
  char2Bytes(
    "https://static.gravity.earth/json/revocation-manager-metadata.json"
  )
);

/**
 * @todo `issued`
 * @todo `proof`
 */
export async function resolve(id: string): Promise<any> {
  const [scheme, address] = id.split("://");

  if (scheme !== "rlist") throw new Error("URI scheme should be 'rlist'");

  const instance = await tezosToolkit.contract.at(address, tzip16);
  const views = await instance.tzip16().metadataViews();
  const { getOwner, getList } = views;
  const owner: string = await getOwner().executeView();
  const list: string = await getList().executeView();
  const res: any = {};

  res["@context"] = [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc-revocation-list-2020/v1",
  ];
  res.id = id;
  res.type = ["VerifiableCredential", "RevocationList2020Credential"];
  res.issuer = `did:pkh:tz:${owner}`;
  res.credentialSubject = {
    id: `${id}#list`,
    type: "RevocationList2020",
    encodedList: list,
  };

  return res;
}

export async function estimateOriginate(
  signer: Signer,
  size: number = MIN_LENGTH
): Promise<Estimate> {
  expect(size).to.be.a("number").and.to.be.greaterThanOrEqual(MIN_LENGTH);

  const owner = await signer.publicKeyHash();
  const value = new Uint8Array(size);
  const bitstring = new Bitstring(value);
  const list = bitstring.toBase64();
  const storage = { owner, metadata, list };

  tezosToolkit.setSignerProvider(signer);

  return tezosToolkit.estimate.originate({ code, storage });
}

export async function originate(
  signer: Signer,
  size: number = MIN_LENGTH
): Promise<OriginationOperation> {
  expect(size).to.be.a("number").and.to.be.greaterThanOrEqual(MIN_LENGTH);

  const owner = await signer.publicKeyHash();
  const value = new Uint8Array(size);
  const bitstring = new Bitstring(value);
  const list = bitstring.toBase64();
  const storage = { owner, metadata, list };

  tezosToolkit.setSignerProvider(signer);
  const operation = await tezosToolkit.contract.originate({ code, storage });
  await operation.confirmation(3);

  if (!operation.contractAddress) throw new Error("Contract not deployed");

  return operation;
}

function validateVC(vc: any): { address: string; index: number } {
  expect(vc).to.be.an("object").and.to.have.property("credentialStatus");
  const { credentialStatus } = vc;

  expect(credentialStatus)
    .to.be.an("object")
    .and.to.have.keys(
      "id",
      "type",
      "revocationListIndex",
      "revocationListCredential"
    );
  const {
    id,
    type,
    revocationListIndex,
    revocationListCredential,
  }: {
    id: string;
    type: string;
    revocationListIndex: string;
    revocationListCredential: string;
  } = credentialStatus;

  expect(id).to.be.a("string").and.to.match(URL_REGEX);
  expect(type).to.be.a("string").and.to.equal("RevocationList2020Status");
  expect(revocationListIndex)
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
  expect(revocationListCredential)
    .to.be.a("string")
    .and.to.satisfy((str: string): boolean => {
      if (!str.startsWith("rlist://")) return false;

      const address = str.substring(8);

      return validateContractAddress(address) === ValidationResult.VALID;
    });

  const index = parseInt(revocationListIndex);
  const address = revocationListCredential.substring(8);

  return { address, index };
}

export async function revoke(
  vc: any,
  signer: Signer
): Promise<TransactionOperation> {
  tezosToolkit.setSignerProvider(signer);

  const { address, index } = validateVC(vc);
  const instance = await tezosToolkit.contract.at(address, tzip16);
  const rlvc = await resolve(vc.credentialStatus.revocationListCredential);
  const {
    credentialSubject: { encodedList },
  } = rlvc;
  const bitstring = Bitstring.fromBase64(encodedList);
  bitstring.turnOn(index);
  const list = bitstring.toBase64();
  const operation = await instance.methods.default(list).send();
  await operation.confirmation(3);

  return operation;
}

export async function unrevoke(
  vc: any,
  signer: Signer
): Promise<TransactionOperation> {
  tezosToolkit.setSignerProvider(signer);

  const { address, index } = validateVC(vc);
  const instance = await tezosToolkit.contract.at(address, tzip16);
  const rlvc = await resolve(vc.credentialStatus.revocationListCredential);
  const {
    credentialSubject: { encodedList },
  } = rlvc;
  const bitstring = Bitstring.fromBase64(encodedList);
  bitstring.turnOff(index);
  const list = bitstring.toBase64();
  const operation = await instance.methods.default(list).send();
  await operation.confirmation(3);

  return operation;
}

export async function isRevoked(vc: any): Promise<boolean> {
  const { index } = validateVC(vc);
  const rlvc = await resolve(vc.credentialStatus.revocationListCredential);
  const {
    credentialSubject: { encodedList },
  } = rlvc;
  const bitstring = Bitstring.fromBase64(encodedList);

  return bitstring.getPosition(index);
}
