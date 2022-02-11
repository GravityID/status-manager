import { MichelsonMapKey } from "@taquito/michelson-encoder";
import { MichelsonMap } from "@taquito/taquito";
import BigNumber from "bignumber.js";

export interface RevocationManagerStorage {
  owner: string;
  list: BigNumber;
  metadata: MichelsonMap<MichelsonMapKey, unknown>;
}
