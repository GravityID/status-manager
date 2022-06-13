# status-manager

This library enables managing statues of Verifiable Credentials in a decentralized manner using the Tezos Blockchain. It uses the [Status List 2021](https://w3c-ccg.github.io/vc-status-list-2021/) specification as base principle to do so.

## Installation

This package requires NodeJS and NPM installed.

```
git clone https://github.com/GravityID/status-manager.git
cd status-manager
npm i
```

## Usage

It is possible to use this package either by integrating it on a Typescript / Javascript code or by running its CLI

### With code

This is the primary way of using the Status Manager package. It unlocks all the possibilities of the package directly embedded in an existing Typescript or Javascript code.

#### Originate

Deploy an instance of Status Manager with an initial status list

```typescript
import { InMemorySigner } from "@taquito/signer";
import { originate } from "status-manager";

const key = "edsk...";
const signer = await InMemorySigner.fromSecretKey(key);
const purpose = "revocation";
const size = 16384;

await originate(signer, purpose, size);
```

#### Revoke

Revoke a Verifiable Credential associated with a Status Manager whose purpose is `revocation`. It changes the storage of the on-chain Status Manager.

```typescript
import { InMemorySigner } from "@taquito/signer";
import { revoke } from "status-manager";

const key = "edsk...";
const signer = await InMemorySigner.fromSecretKey(key);
const vc = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1"
  ],
  "id": "https://example.com/credentials/23894672394",
  "type": ["VerifiableCredential"],
  "issuer": "did:example:12345",
  "issued": "2020-04-05T14:27:42Z",
  "credentialStatus": {
    "id": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB#94567",
    "type": "StatusList2021Entry",
    "statusPurpose": "revocation",
    "statusListIndex": "94567",
    "statusListCredential": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB",
  },
  "credentialSubject": {
    "id": "did:example:6789",
    "type": "Person"
  }
}

await revoke([vc], signer);
```

#### Suspend

Suspend a Verifiable Credential associated with a Status Manager whose purpose is `suspension`. It changes the storage of the on-chain Status Manager.

```typescript
import { InMemorySigner } from "@taquito/signer";
import { suspend } from "status-manager";

const key = "edsk...";
const signer = await InMemorySigner.fromSecretKey(key);
const vc = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1"
  ],
  "id": "https://example.com/credentials/23894672394",
  "type": ["VerifiableCredential"],
  "issuer": "did:example:12345",
  "issued": "2020-04-05T14:27:42Z",
  "credentialStatus": {
    "id": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB#94567",
    "type": "StatusList2021Entry",
    "statusPurpose": "suspension",
    "statusListIndex": "94567",
    "statusListCredential": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB",
  },
  "credentialSubject": {
    "id": "did:example:6789",
    "type": "Person"
  }
}

await suspend([vc], signer);
```

#### Unsuspend

Unsuspend a Verifiable Credential associated with a Status Manager whose purpose is `suspension`. It changes the storage of the on-chain Status Manager.

```typescript
import { InMemorySigner } from "@taquito/signer";
import { unsuspend } from "status-manager";

const key = "edsk...";
const signer = await InMemorySigner.fromSecretKey(key);
const vc = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1"
  ],
  "id": "https://example.com/credentials/23894672394",
  "type": ["VerifiableCredential"],
  "issuer": "did:example:12345",
  "issued": "2020-04-05T14:27:42Z",
  "credentialStatus": {
    "id": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB#94567",
    "type": "StatusList2021Entry",
    "statusPurpose": "suspension",
    "statusListIndex": "94567",
    "statusListCredential": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB",
  },
  "credentialSubject": {
    "id": "did:example:6789",
    "type": "Person"
  }
}

await unsuspend([vc], signer);
```

#### Resolve

Build a `StatusList2021Credential` from a Status Manager. The result can be cached in order to be accessible offline.

```typescript
import { InMemorySigner } from "@taquito/signer";
import { resolve } from "status-manager";

const id = "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB";
const vc = await resolve(id);

console.log(vc);

/**
 * {
 *   "@context": [
 *     "https://www.w3.org/2018/credentials/v1",
 *     "https://w3id.org/vc/status-list/2021/v1"
 *   ],
 *   "id": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB",
 *   "type": [
 *     "VerifiableCredential",
 *     "StatusList2021Credential"
 *   ],
 *   "issuer": "did:pkh:tz:tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6",
 *   "credentialSubject": {
 *     "id": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB#list",
 *     "type": "StatusList2021",
 *     "statusPurpose": "revocation",
 *     "encodedList": "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA"
 *   }
 * }
 */
```

#### Read status

Check whether a Verifiable Credential is marked with a status or not. This method directly reads from the on-chain Status Manager.

```typescript
import { InMemorySigner } from "@taquito/signer";
import { isMarked } from "status-manager";

const vc = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1"
  ],
  "id": "https://example.com/credentials/23894672394",
  "type": ["VerifiableCredential"],
  "issuer": "did:example:12345",
  "issued": "2020-04-05T14:27:42Z",
  "credentialStatus": {
    "id": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB",
    "type": "StatusList2021Entry",
    "statusPurpose": "revocation",
    "statusListIndex": "94567",
    "statusListCredential": "slist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB"
  },
  "credentialSubject": {
    "id": "did:example:6789",
    "type": "Person"
  }
}
const marked = await isMarked(vc);

console.log(marked); // boolean
```

### With CLI

A command-line interface (CLI) is also available for developers to use and does not require any software integration.

```
jean@pc-de-jean:~/Projects/Code/status-manager$ ./bin/cli.js -h
Usage: status-manager [options] [command]

Options:
  -V, --version                output the version number
  -h, --help                   display help for command

Commands:
  originate [options]          deploy an instance of Status Manager with an initial status list
  resolve [options] <manager>  build a StatusList2021Credential from a Status Manager
  is-marked [options]          check whether a Verifiable Credential is marked or not
  revoke [options]             revoke a Verifiable Credential associated with a Status Manager
  suspend [options]            suspend a Verifiable Credential associated with a Status Manager
  unsuspend [options]          unsuspend a Verifiable Credential associated with a Status Manager
  help [command]               display help for command
```
