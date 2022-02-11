import { TezosToolkit } from "@taquito/taquito";
import { tzip16, Tzip16Module } from "@taquito/tzip16";
import { numberToEncodedList } from "./utils";

const rpc =
  process.env.TEZOS_RPC || process.env.VUE_APP_TEZOS_RPC || "localhost:8080";

const tezosToolkit = new TezosToolkit(rpc);
tezosToolkit.addExtension(new Tzip16Module());

/**
 * @todo `issued`
 * @todo `proof`
 */
export default async function resolve(id: string): Promise<any> {
  const [scheme, address] = id.split("://");

  if (scheme !== "rlist") throw new Error("URI scheme should be 'rlist'");

  const instance = await tezosToolkit.contract.at(address, tzip16);
  const views = await instance.tzip16().metadataViews();
  const { getOwner, getList } = views;
  const owner = await getOwner().executeView();
  const list = await getList().executeView();
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
    encodedList: numberToEncodedList(list),
  };

  return res;
}
