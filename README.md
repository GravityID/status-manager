# revocation-manager

This library enables revocation of Verifiable Credentials in a decentralized manner using the Tezos Blockchain. It uses the [Revocation List 2020](https://w3c-ccg.github.io/vc-status-rl-2020/) specification as base principle to manage revocation.

## Installation

This package requires NodeJS and NPM installed.

```
git clone https://github.com/GravityID/revocation-manager.git
cd revocation-manager
npm i
```

## Usage

It is possible to use this package either by integrating it on a Typescript / Javascript code or by running its CLI

### With code

This is the primary way of using the Revocation Manager package. It unlocks all the possibilities of the package directly embedded in an existing Typescript or Javascript code.

#### Originate

Deploy an instance of Revocation Manager with an initial revocation list

```typescript
import { InMemorySigner } from "@taquito/signer";
import { originate } from "revocation-manager";

const key = "edsk...";
const signer = await InMemorySigner.fromSecretKey(key);
const size = 16384;

await originate(signer, size);
```

#### Revoke

Revoke a Verifiable Credential associated with a Revocation Manager. It changes the storage of the on-chain Revocation Manager.

```typescript
import { InMemorySigner } from "@taquito/signer";
import { revoke } from "revocation-manager";

const key = "edsk...";
const signer = await InMemorySigner.fromSecretKey(key);
const vc = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc-revocation-list-2020/v1"
  ],
  "id": "https://example.com/credentials/23894672394",
  "type": ["VerifiableCredential"],
  "issuer": "did:example:12345",
  "issued": "2020-04-05T14:27:42Z",
  "credentialStatus": {
    "id": "https://dmv.example.gov/credentials/status/3#94567",
    "type": "RevocationList2020Status",
    "revocationListIndex": "94567",
    "revocationListCredential": "rlist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB",
  },
  "credentialSubject": {
    "id": "did:example:6789",
    "type": "Person"
  }
}

await revoke([vc], signer);
```

#### Resolve

Build a `RevocationList2020Credential` from a Revocation Manager. The result can be cached and accessed while being offline.

```typescript
import { InMemorySigner } from "@taquito/signer";
import { resolve } from "revocation-manager";

const id = "rlist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB";
const vc = await resolve(id);

console.log(vc);

/**
 * {
 *   "@context": [
 *     "https://www.w3.org/2018/credentials/v1",
 *     "https://w3id.org/vc-revocation-list-2020/v1"
 *   ],
 *   "id": "rlist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB",
 *   "type": [
 *     "VerifiableCredential",
 *     "RevocationList2020Credential"
 *   ],
 *   "issuer": "did:pkh:tz:tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6",
 *   "credentialSubject": {
 *     "id": "rlist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB#list",
 *     "type": "RevocationList2020",
 *     "encodedList": "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA"
 *   }
 * }
 */
```

#### Revocation status

Check whether a Verifiable Credential is revoked or not. This method directly reads the revocation status from the on-chain Revocation Manager.

```typescript
import { InMemorySigner } from "@taquito/signer";
import { isRevoked } from "revocation-manager";

const vc = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc-revocation-list-2020/v1"
  ],
  "id": "https://example.com/credentials/23894672394",
  "type": ["VerifiableCredential"],
  "issuer": "did:example:12345",
  "issued": "2020-04-05T14:27:42Z",
  "credentialStatus": {
    "id": "https://dmv.example.gov/credentials/status/3#94567",
    "type": "RevocationList2020Status",
    "revocationListIndex": "94567",
    "revocationListCredential": "rlist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB"
  },
  "credentialSubject": {
    "id": "did:example:6789",
    "type": "Person"
  }
}
const revoked = await isRevoked(vc);

console.log(revoked); // boolean
```

### With CLI

A command-line interface (CLI) is also available for developers to use and does not require any software integration.

```
jean@pc-de-jean:~/Projects/Code/revocation-manager$ ./bin/cli.js -h
Usage: revocation-manager [options] [command]

Options:
  -V, --version                output the version number
  -h, --help                   display help for command

Commands:
  originate [options]          deploy an instance of Revocation Manager with an initial revocation list
  resolve [options] <manager>  build a RevocationList2020Credential from a Revocation Manager
  is-revoked [options]         check whether a Verifiable Credential is revoked or not
  revoke [options]             revoke a Verifiable Credential associated with a Revocation Manager
  unrevoke [options]           unrevoke a Verifiable Credential associated with an Revocation Manager
  help [command]               display help for command
```
