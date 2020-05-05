# Cocoda SDK
[![Build Status](https://travis-ci.com/gbv/cocoda-sdk.svg?branch=master)](https://travis-ci.com/gbv/cocoda-sdk)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/cocoda-sdk.svg?label=version)](https://github.com/gbv/cocoda-sdk)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> SDK for [Cocoda](https://github.com/gbv/cocoda) and [coli-conc](https://coli-conc.gbv.de/) services

**Note: This is currently evolving and methods can be removed or changed without notice! If you're not prepared for that, please wait until version 1.0.0.**

## Table of Contents
- [Install](#install)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Install
```bash
npm i gbv/cocoda-sdk
```

We suggest to install it referring to a certain commit and updating only after making sure that everything works (at least until version 1.0.0 is released):

```bash
npm i gbv/cocoda-sdk#abc1def
```

**Note:** Replace the commit hash with the desired commit.

## Usage

### Import
`cocoda-sdk` exports a default instance as a singleton, that means that the same object is used anywhere in a project where `cocoda-sdk` is imported.

```js
const cdk = require("cocoda-sdk")
```

### Configuration
`cocoda-sdk` takes a `config` option which is equivalent to the configuration file in [Cocoda](https://github.com/gbv/cocoda).

```js
const config = require("./config") // Import configuration from somewhere
const cdk = require("cocoda-sdk")
cdk.config = config
```
or
```js
const config = require("./config") // Import configuration from somewhere
const cdk = require("cocoda-sdk")(config)
```

This should be done only once because certain steps are performed after setting the config file.

### Methods
`cocoda-sdk`'s "providers" (which are basically different types of APIs) offer several methods to access the API that use the [RORO pattern](https://www.freecodecamp.org/news/elegant-patterns-in-modern-javascript-roro-be01e7669cbd/) ("receive an object, return an object"), i.e. every method only has a single object parameter and the properties of that object are the actual parameters for the method.

All of these provider methods are also available on the default instance of `cocoda-sdk`, only that they require an additional property `registry`.

Simplest example:
```js
cdk.getMappings({ registry })
```

It would also be possible to use the provider directly on the registry:
```js
registry.provider.getMappings()
```

<!-- TODO -->

### Multiple Instances
If you need multiple instances of `cocoda-sdk`, use the `createInstance` method on the default instance:

```js
const newCdk = cdk.createInstance({ newConfig })
```

It will be completely separate from the default instance.

### Providers
It is possible to get direct access to provider classes.

```js
const providers = require("cocoda-sdk/providers")
// Example
const provider = new providers.MappingsApi({ registry })
```

The following providers are offered in `cocoda-sdk` by default:
- `Base` - the base provider that all other providers inherit from
- `ConceptApi` - access to concept schemes and concepts via [jskos-server]
- `MappingsApi` - access to concordances, mappings, and annotations via [jskos-server]
- `LocalMappings` - access to local mappings via [localForage](https://github.com/localForage/localForage) (only available in browser)
- `SkosmosApi` - access to concept schemes and concepts via a [Skosmos](https://github.com/NatLibFi/Skosmos) API
- `ReconciliationApi` - access to mapping suggestions via a [OpenRefine Reconciliation API](https://github.com/OpenRefine/OpenRefine/wiki/Reconciliation-Service-API)
- `OccurrencesApi` - access to concept occurrences via [occurrences-api](https://github.com/gbv/occurrences-api) (will be changed to [occurrences-server](https://github.com/gbv/occurrences-server) in the future)
- `SearchSuggestion` - access to mapping suggestions using other registries' search endpoints (using [jskos-server])

### Errors
`cocoda-sdk` defines some custom errors.

```js
const errors = require("cocoda-sdk/errors")
```

The following errors are defined:
- `CDKError` - generic error
- `MethodNotImplementedError` - called method is available, but not implemented by the provider
- `InvalidOrMissingParameterError` - a parameter is missing or invalid
- `MissingRegistryError` - a registry parameter is necessary to call this method
- `InvalidRequestError` - the request was invalid
- `MissingApiUrlError` - the API URL necessary to make this request is not defined on the registry

## Maintainers
- [@stefandesu](https://github.com/stefandesu)
- [@nichtich](https://github.com/nichtich)

## Contribute
PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License
MIT Copyright (c) 2020 Verbundzentrale des GBV (VZG)

[jskos-server]: https://github.com/gbv/jskos-server
