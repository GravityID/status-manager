# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0 - 2022-03-29]

### Changed

- Files
	- `src/revocation_manager.ts` -> `src/index.ts`


## [1.0.0 - 2022-02-28]

### Added

- Files
	- `bin/`
	- `src/`
	- `test/`
	- `README.md`
	- `CHANGELOG.md`

- Features
	- Methods:
		- `originate`: deploy an instance of Revocation Manager with an initial revocation list
		- `resolve`: build a RevocationList2020Credential from a Revocation Manager
		- `is-revoked`: check whether a Verifiable Credential is revoked or not
		- `revoke`: revoke a Verifiable Credential associated with a Revocation Manager
		- `unrevoke`: unrevoke a Verifiable Credential associated with a Revocation Manager
	- CLI
