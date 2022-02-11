#!/usr/bin/env node

const { Argument, Command, Option } = require("commander");
const pjson = require("../package.json");
const program = new Command(pjson.name);
const fs = require("fs");
const { InMemorySigner } = require("@taquito/signer");
const { originate, isRevoked, revoke, unrevoke } = require("../lib/taquito/src/originate");
const { default: resolve } = require("../lib/taquito/src/resolver");
const {
  OriginationOperation,
  TransactionOperation,
} = require("@taquito/taquito");
const getStdin = require("get-stdin");

program.version(pjson.version);

const privateKeyFileOption = new Option(
  "--private-key-file <private-key-file>",
  "path to file containing private key prefix-encoded in base58"
).makeOptionMandatory(true);

const rpcOption = new Option(
  "--rpc <rpc>",
  "rpc url to use to interact with the Tezos network"
).env("TEZOS_RPC");

const vcIdArgument = new Argument(
  "<manager>",
  "id of the revocation list credential"
);

/**
 * @param {OriginationOperation | TransactionOperation} op
 */
function debugOperation(op) {
  console.debug(`==================== Operation debug ====================
Hash: ${op.hash}
Included in block: ${op.includedInBlock}
Fee: ${op.fee}
Consumed gas: ${op.consumedGas}
Gas limit: ${op.gasLimit}
Status: ${op.status}`);
}

program
  .command("originate")
  .addOption(privateKeyFileOption)
  .addOption(rpcOption)
  .action(
    /**
     * @param {object} options
     * @param {string} options.privateKeyFile
     */
    async (options) => {
      const { privateKeyFile } = options;

      try {
        const privateKey = fs
          .readFileSync(privateKeyFile)
          .toString("utf-8")
          .trim();
        const signer = await InMemorySigner.fromSecretKey(privateKey);
        const op = await originate(signer);

        debugOperation(op);

        console.debug("\nRevocation manager deployed");
        console.debug(`Id: rlist://${op.contractAddress}`);
        console.debug(`Issuer: did:phk:tz:${await signer.publicKeyHash()}`);
      } catch (err) {
        console.error(err);
      }
    }
  );

program
  .command("resolve")
  .addOption(rpcOption)
  .addArgument(vcIdArgument)
  .action(async (id) => {
    try {
      const vc = await resolve(id);

      console.log(JSON.stringify(vc, null, 2));
    } catch (err) {
      console.error(err);
    }
  });


program
  .command("is-revoked")
  .addOption(rpcOption)
  .action(async () => {
    try {
      const vc = JSON.parse(await getStdin());
      const revoked = await isRevoked(vc);

      console.debug(`Credential id: ${vc.id}`);
      console.debug(`Revocation manager id: ${vc.credentialStatus.revocationListCredential}`);
      console.debug(`Index: ${vc.credentialStatus.revocationListIndex} Value: ${revoked}`);
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("revoke")
  .addOption(privateKeyFileOption)
  .addOption(rpcOption)
  .action(
    /**
     * @param {object} options
     * @param {string} options.privateKeyFile
     */
    async (options) => {
      const { privateKeyFile } = options;

      try {
        const privateKey = fs
          .readFileSync(privateKeyFile)
          .toString("utf-8")
          .trim();
        const signer = await InMemorySigner.fromSecretKey(privateKey);
	const vc = JSON.parse(await getStdin());
        const op = await revoke(vc, signer);

        debugOperation(op);

	console.debug(`Credential id: ${vc.id}`);
	console.debug(`Revocation manager id: ${vc.credentialStatus.revocationListCredential}`);
	console.debug(`Index: ${vc.credentialStatus.revocationListIndex}`);
      } catch (err) {
        console.error(err);
      }
    }
  );

program
  .command("unrevoke")
  .addOption(privateKeyFileOption)
  .addOption(rpcOption)
  .action(
    /**
     * @param {object} options
     * @param {string} options.privateKeyFile
     */
    async (options) => {
      const { privateKeyFile } = options;

      try {
        const privateKey = fs
          .readFileSync(privateKeyFile)
          .toString("utf-8")
          .trim();
        const signer = await InMemorySigner.fromSecretKey(privateKey);
	const vc = JSON.parse(await getStdin());
        const op = await unrevoke(vc, signer);

        debugOperation(op);

	console.debug(`Credential id: ${vc.id}`);
	console.debug(`Revocation manager id: ${vc.credentialStatus.revocationListCredential}`);
	console.debug(`Index: ${vc.credentialStatus.revocationListIndex}`);
      } catch (err) {
        console.error(err);
      }
    }
  );


program.parse(process.argv);
