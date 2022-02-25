# revocation-manager

This library enables revocation of Verifiable Credentials in a decentralized manner using the Tezos Blockchain. It uses the [Revocation List 2020](https://w3c-ccg.github.io/vc-status-rl-2020/) specification as basic principle to manage revocation.

## Installation

This package requires NodeJS and NPM installed.

```
git clone https://github.com/GravityID/revocation-manager.git
cd revocation-manager
npm i
```

## Usage

### Originate

Deploy an instance of Revocation Manager with a initial revocation list filled with 0

```typescript
import { InMemorySigner } from "@taquito/signer";
import { originate } from "revocation-manager";

const key = "edsk...";
const signer = await InMemorySigner.fromSecretKey(key);
const size = 16384;

await originate(signer, size);
```

### Revoke

Revoke a Verifiable Credential associated with an on-chain Revocation Manager

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

await revoke(vc, signer);
```

### Unrevoke

Unrevoke a Verifiable Credential associated with an on-chain Revocation Manager

```typescript
import { InMemorySigner } from "@taquito/signer";
import { unrevoke } from "revocation-manager";

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
    "revocationListCredential": "rlist://KT1U4xsumuCWY7UZRrr7hVGtqEi2MsuisUUB"
  },
  "credentialSubject": {
    "id": "did:example:6789",
    "type": "Person"
  }
}

await unrevoke(vc, signer);
```

### Resolve

Build a `RevocationList2020Credential` from a Revocation Manager

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
