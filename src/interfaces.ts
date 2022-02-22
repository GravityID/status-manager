import { MichelsonMapKey } from "@taquito/michelson-encoder";
import { MichelsonMap } from "@taquito/taquito";

export interface RevocationManagerStorage {
  owner: string;
  list: string;
  metadata: MichelsonMap<MichelsonMapKey, unknown>;
}
