import {
  MichelsonMap,
  OriginationOperation,
  Signer,
  TezosToolkit,
  TransactionOperation,
} from "@taquito/taquito";
import { char2Bytes, tzip16, Tzip16Module } from "@taquito/tzip16";
import { validateContractAddress, ValidationResult } from "@taquito/utils";
import { expect } from "chai";
import code from "../../contract/contract.json";

const URL_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

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

export async function originate(signer: Signer): Promise<OriginationOperation> {
  const owner = await signer.publicKeyHash();
  const list = 0;
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

export function revoke(vc: any, signer: Signer): Promise<TransactionOperation> {
  const { address, index } = validateVC(vc);

  return turnOn(address, index, signer);
}

export function unrevoke(
  vc: any,
  signer: Signer
): Promise<TransactionOperation> {
  const { address, index } = validateVC(vc);

  return turnOff(address, index, signer);
}

export async function isRevoked(vc: any): Promise<boolean> {
  const { address, index } = validateVC(vc);

  return getValue(address, index);
}

export async function turnOn(
  address: string,
  index: number,
  signer: Signer
): Promise<TransactionOperation> {
  tezosToolkit.setSignerProvider(signer);

  const instance = await tezosToolkit.contract.at(address, tzip16);
  const operation = await instance.methods.on(index).send();
  await operation.confirmation(3);

  return operation;
}

export async function turnOff(
  address: string,
  index: number,
  signer: Signer
): Promise<TransactionOperation> {
  tezosToolkit.setSignerProvider(signer);

  const instance = await tezosToolkit.contract.at(address, tzip16);
  const operation = await instance.methods.off(index).send();
  await operation.confirmation(3);

  return operation;
}

export async function getValue(
  address: string,
  index: number
): Promise<boolean> {
  const instance = await tezosToolkit.contract.at(address, tzip16);
  const { getValue } = await instance.tzip16().metadataViews();

  return getValue().executeView(index);
}
