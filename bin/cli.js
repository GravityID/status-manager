#!/usr/bin/env node

require("dotenv/config");
const { Argument, Command, Option } = require("commander");
const pjson = require("../package.json");
const program = new Command(pjson.name);
const fs = require("fs");
const { InMemorySigner } = require("@taquito/signer");
const {
  originate,
  isRevoked,
  isSuspended,
  revoke,
  suspend,
  unsuspend,
  resolve,
} = require("../lib/index");
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

const typeOption = new Option(
  "--type <type>",
  "type of the status list"
).choices(["revocation", "suspension"]);

const vcIdArgument = new Argument(
  "<manager>",
  "id of the status list credential"
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
  .description(
    "deploy an instance of Status Manager with an initial status list"
  )
  .addOption(privateKeyFileOption)
  .addOption(rpcOption)
  .addOption(typeOption)
  .action(
    /**
     * @param {object} options
     * @param {string} options.privateKeyFile
     * @param {string} options.type
     */
    async (options) => {
      const { privateKeyFile, type } = options;

      try {
        const privateKey = fs
          .readFileSync(privateKeyFile)
          .toString("utf-8")
          .trim();
        const signer = await InMemorySigner.fromSecretKey(privateKey);
        const op = await originate(signer, type);

        debugOperation(op);

        console.debug("\nStatus Manager deployed");
        console.debug(`Id: slist://${op.contractAddress}`);
        console.debug(`Issuer: did:phk:tz:${await signer.publicKeyHash()}`);
      } catch (err) {
        console.error(err);
      }
    }
  );

program
  .command("resolve")
  .description("build a StatusList2021Credential from a Status Manager")
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
  .description("check whether a Verifiable Credential is revoked or not")
  .addOption(rpcOption)
  .action(async () => {
    try {
      const vc = JSON.parse(await getStdin());
      const revoked = await isRevoked(vc);

      console.debug(`Credential id: ${vc.id}`);
      console.debug(
        `Status Manager id: ${vc.credentialStatus.statusListCredential}`
      );
      console.debug(
        `Index: ${vc.credentialStatus.statusListIndex} Value: ${revoked}`
      );
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("is-suspended")
  .description("check whether a Verifiable Credential is suspended or not")
  .addOption(rpcOption)
  .action(async () => {
    try {
      const vc = JSON.parse(await getStdin());
      const suspended = await isSuspended(vc);

      console.debug(`Credential id: ${vc.id}`);
      console.debug(
        `Status Manager id: ${vc.credentialStatus.statusListCredential}`
      );
      console.debug(
        `Index: ${vc.credentialStatus.statusListIndex} Value: ${suspended}`
      );
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("revoke")
  .description(
    "revoke a Verifiable Credential associated with a Status Manager"
  )
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
        const op = await revoke(signer, [vc]);

        debugOperation(op);

        console.debug(`Credential id: ${vc.id}`);
        console.debug(
          `Status Manager id: ${vc.credentialStatus.statusListCredential}`
        );
        console.debug(`Index: ${vc.credentialStatus.statusListIndex}`);
      } catch (err) {
        console.error(err);
      }
    }
  );

program
  .command("suspend")
  .description(
    "suspend a Verifiable Credential associated with a Status Manager"
  )
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
        const op = await suspend(signer, [vc]);

        debugOperation(op);

        console.debug(`Credential id: ${vc.id}`);
        console.debug(
          `Status Manager id: ${vc.credentialStatus.statusListCredential}`
        );
        console.debug(`Index: ${vc.credentialStatus.statusListIndex}`);
      } catch (err) {
        console.error(err);
      }
    }
  );

program
  .command("unsuspend")
  .description(
    "unsuspend a Verifiable Credential associated with a Status Manager"
  )
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
        const op = await unsuspend(signer, [vc]);

        debugOperation(op);

        console.debug(`Credential id: ${vc.id}`);
        console.debug(
          `Status Manager id: ${vc.credentialStatus.statusListCredential}`
        );
        console.debug(`Index: ${vc.credentialStatus.statusListIndex}`);
      } catch (err) {
        console.error(err);
      }
    }
  );

program.parse(process.argv);
