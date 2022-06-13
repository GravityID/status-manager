import { MichelsonMapKey } from "@taquito/michelson-encoder";
import { MichelsonMap } from "@taquito/taquito";

export interface StatusManagerStorage {
  owner: string;
  purpose: string;
  list: string;
  metadata: MichelsonMap<MichelsonMapKey, unknown>;
}
