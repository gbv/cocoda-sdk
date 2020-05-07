# Cocoda SDK
![Node.js CI](https://github.com/gbv/cocoda-sdk/workflows/Node.js%20CI/badge.svg)
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
`cocoda-sdk` takes a `config` option which is equivalent to the configuration file in [Cocoda](https://github.com/gbv/cocoda#configuration). In particular the configuration contains an array field [`registries`](#registries).

```js
const config = require("./config") // Import configuration from somewhere
const cdk = require("cocoda-sdk")
cdk.config = config
```
or
```js
const config = require("./config") // Import configuration from somewhere
const cdk = require("cocoda-sdk")({ config })
```

This should be done only once because certain steps are performed after setting the config file.

The configuration can also be loaded from a URL:

```js
const cdk = require("cocoda-sdk")
await cdk.loadConfig("https://raw.githubusercontent.com/gbv/cocoda/dev/config/cocoda.default.json")
```

If you only use `cocoda-sdk` with a single registry, configuration might not be necessary (see below).

### Registries

A registry is an individual source of data, for instance a set of concept schemes available from a specific terminology service. The simplest registry consists only of a unique identifier (`uri`) and the name of the access provider (`provider`):

```json
{
  "uri": "http://coli-conc.gbv.de/registry/local-mappings",
  "provider": "LocalMappings"
}
```

A list of available providers can be found [below](#providers). Most providers need additional properties to work correctly.

#### Using a Single Registry

If you only have a single registry you want to access, you can initialize it as follows:

```js
const cdk = require("cocoda-sdk")
const registry = cdk.initializeRegistry({
  uri: "http://coli-conc.gbv.de/registry/local-mappings",
  provider: "LocalMappings"
})
// Now, access methods are available on the registry:
registry.getMappings()
```

#### Using Registries From a Configuration

If you initialize `cocoda-sdk` with a [configuration](#configuration), it will initialize all included registries automatically. Those registries are then accessible via `cdk.config.registries`. Alternatively, you can retrieve registries by URI:

```js
// After setting up cdk
const registry = cdk.getRegistryForUri("...")
```

### Providers

Providers allow access to different types of APIs.

The following providers are offered in `cocoda-sdk` by default:
- `Base` - the base provider that all other providers have to inherit from
- `ConceptApi` - access to concept schemes and concepts via [jskos-server]
- `MappingsApi` - access to concordances, mappings, and annotations via [jskos-server]
- `LocalMappings` - access to local mappings via [localForage](https://github.com/localForage/localForage) (only available in browser)
- `SkosmosApi` - access to concept schemes and concepts via a [Skosmos](https://github.com/NatLibFi/Skosmos) API
- `ReconciliationApi` - access to mapping suggestions via a [OpenRefine Reconciliation API](https://github.com/OpenRefine/OpenRefine/wiki/Reconciliation-Service-API)
- `OccurrencesApi` - access to concept occurrences via [occurrences-api](https://github.com/gbv/occurrences-api) (will be changed to [occurrences-server](https://github.com/gbv/occurrences-server) in the future)
- `SearchSuggestion` - access to mapping suggestions using other registries' search endpoints (using [jskos-server])

It is also possible to add custom providers that inherit from BaseProvider:

```js
const CustomProvider = require("CustomProvider")
cdk.addProvider(CustomProvider)
```

It is then possible to use that provider via `cocoda-sdk` as well. (See also: Example under `examples/custom-provider.js`.)

### Methods

A `cocoda-sdk` instance itself offers only a handful of methods. The actual access to APIs happens through [registries](#registries). The following list of methods assume either an instance of `cocoda-sdk` (`cdk.someMethod`) or an initialized registry (`registry.someMethod`).

#### `cdk.createInstance()`
Creates an additional instance of `cocoda-sdk`.

#### `cdk.loadConfig(url)` (async)
Loads a configuration from a URL into the current instance.

#### `cdk.loadBuildInfo({ url, buildInfo = null, interval = 60000, callback })`
Sets up a regular query of a `build-info.json` file for Cocoda. `callback` will be called whenever the build info updates.

#### `cdk.getRegistryForUri(uri)`
Returns the initialized registry from the configuration for the given `uri`.

#### `cdk.initializeRegistry(registry)`
Returns an initialized registry (see [above](#registries)).

#### `cdk.addProvider(CustomProvider)`
Adds a custom provider to `cocoda-sdk` (see [above](#providers)).

#### `registry.getSchemes()` (async)
Requests a list of concept schemes from a registry.

...

<!-- TODO: Add more methods -->

### Multiple Instances
If you need multiple instances of `cocoda-sdk`, use the `createInstance` method on the default instance:

```js
const newCdk = cdk.createInstance({ config: newConfig })
```

It will be completely separate from the default instance.

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
