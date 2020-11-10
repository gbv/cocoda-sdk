# Cocoda SDK
![Node.js CI](https://github.com/gbv/cocoda-sdk/workflows/Node.js%20CI/badge.svg)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/cocoda-sdk.svg?label=version)](https://github.com/gbv/cocoda-sdk)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> SDK for [Cocoda](https://github.com/gbv/cocoda) and [coli-conc](https://coli-conc.gbv.de/) services

**Note: This is currently evolving and methods can be removed or changed without notice! If you're not prepared for that, please wait until version 1.0.0.**

## Table of Contents
- [Install](#install)
- [Usage](#usage)
- [Methods](#methods)
- [Errors](#errors)
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
`cocoda-sdk` exports a default instance, so the same object is used on each import of `cocoda-sdk`.

```js
const cdk = require("cocoda-sdk")
```

### Configuration
`cocoda-sdk` can be configured after import:

```js
const cdk = require("cocoda-sdk")
cdk.setConfig(config)
```

The configuration can also be loaded from a URL:

```js
const cdk = require("cocoda-sdk")
await cdk.loadConfig("https://raw.githubusercontent.com/gbv/cocoda/dev/config/cocoda.default.json")
```

The configuration is a JSON object corresponding the the [configuration format of Cocoda](https://github.com/gbv/cocoda#configuration). In particular, the configuration contains an array property [`registries`](#registries).

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
- `LabelSearchSuggestion` - access to mapping suggestions using other registries' search endpoints (using [jskos-server])

Please refer to each provider's documentation for how exactly to configure that provider: [Documentation](https://gbv.github.io/cocoda-sdk/)

It is also possible to add custom providers that inherit from BaseProvider:

```js
const CustomProvider = require("CustomProvider")
cdk.addProvider(CustomProvider)
```

It is then possible to use that provider via `cocoda-sdk` as well. (See also: Example under [`examples/custom-provider.js`](https://github.com/gbv/cocoda-sdk/blob/master/examples/custom-provider.js).)

### Multiple Instances

The `createInstance` method can be used to create a new and independent instance with a separate configuration if needed:

```js
const newCdk = cdk.createInstance(config)
```

## Methods

A `cocoda-sdk` instance itself offers only a handful of methods. The actual access to APIs happens through [registries](#registries). The following list of methods assume either an instance of `cocoda-sdk` (`cdk.someMethod`) or an initialized registry (`registry.someMethod`). Documentation for registry methods is on a per-provider basis. While the API should be the same for a particular methods across providers, the details on how to use it might differ.

### Methods for `cocoda-sdk` instance
Please refer to the [documentation](https://gbv.github.io/cocoda-sdk/CocodaSDK.html).

### Registry Methods - General

#### `registry.init`
- [BaseProvider - init](https://gbv.github.io/cocoda-sdk/BaseProvider.html#init)

#### `registry.isAuthorizedFor`
- [BaseProvider - isAuthorizedFor](https://gbv.github.io/cocoda-sdk/BaseProvider.html#isAuthorizedFor)

#### `registry.supportsScheme`
- [BaseProvider - supportsScheme](https://gbv.github.io/cocoda-sdk/BaseProvider.html#supportsScheme)
- [LabelSearchSuggestionProvider - supportsScheme](https://gbv.github.io/cocoda-sdk/LabelSearchSuggestionProvider.html#supportsScheme)

#### `registry.setAuth`
- [BaseProvider - setAuth](https://gbv.github.io/cocoda-sdk/BaseProvider.html#setAuth)

#### `registry.setRetryConfig`
- [BaseProvider - setRetryConfig](https://gbv.github.io/cocoda-sdk/BaseProvider.html#setRetryConfig)

#### `registry.setRegistries`
- [LabelSearchSuggestionProvider - setRegistries](https://gbv.github.io/cocoda-sdk/LabelSearchSuggestionProvider.html#setRegistries)

#### `registry.getCancelTokenSource`
- [BaseProvider - getCancelTokenSource](https://gbv.github.io/cocoda-sdk/BaseProvider.html#getCancelTokenSource)

### Registry Methods - Concept Schemes

#### `registry.getSchemes`
- [ConceptApiProvider - getSchemes](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#getSchemes)
- [SkosmosApiProvider - getSchemes](https://gbv.github.io/cocoda-sdk/SkosmosApiProvider.html#getSchemes)

#### `registry.vocSearch`
- [ConceptApiProvider - vocSearch](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#vocSearch)

#### `registry.vocSuggest`
- [ConceptApiProvider - vocSuggest](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#vocSuggest)

### Registry Methods - Concepts

#### `registry.getTop`
- [ConceptApiProvider - getTop](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#getTop)

#### `registry.getConcepts`
- [ConceptApiProvider - getConcepts](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#getConcepts)
- [SkosmosApiProvider - getConcepts](https://gbv.github.io/cocoda-sdk/SkosmosApiProvider.html#getConcepts)

#### `registry.getNarrower`
- [ConceptApiProvider - getNarrower](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#getNarrower)
- [SkosmosApiProvider - getNarrower](https://gbv.github.io/cocoda-sdk/SkosmosApiProvider.html#getNarrower)

#### `registry.getAncestors`
- [ConceptApiProvider - getAncestors](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#getAncestors)
- [SkosmosApiProvider - getAncestors](https://gbv.github.io/cocoda-sdk/SkosmosApiProvider.html#getAncestors)

#### `registry.search`
- [ConceptApiProvider - search](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#search)
- [SkosmosApiProvider - search](https://gbv.github.io/cocoda-sdk/SkosmosApiProvider.html#search)

#### `registry.suggest`
- [ConceptApiProvider - suggest](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#suggest)
- [SkosmosApiProvider - suggest](https://gbv.github.io/cocoda-sdk/SkosmosApiProvider.html#suggest)

### Registry Methods - Mappings

#### `registry.getMappings`
- [MappingsApiProvider - getMappings](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#getMappings)
- [LocalMappingsProvider - getMappings](https://gbv.github.io/cocoda-sdk/LocalMappingsProvider.html#getMappings)
- [ReconciliationApiProvider - getMappings](https://gbv.github.io/cocoda-sdk/ReconciliationApiProvider.html#getMappings)
- [LabelSearchSuggestionProvider - getMappings](https://gbv.github.io/cocoda-sdk/LabelSearchSuggestionProvider.html#getMappings)
- [OccurrencesApiProvider - getMappings](https://gbv.github.io/cocoda-sdk/OccurrencesApiProvider.html#getMappings)

#### `registry.getMapping`
- [MappingsApiProvider - getMapping](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#getMapping)
- [LocalMappingsProvider - getMapping](https://gbv.github.io/cocoda-sdk/LocalMappingsProvider.html#getMapping)

#### `registry.postMapping`
- [MappingsApiProvider - postMapping](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#postMapping)
- [LocalMappingsProvider - postMapping](https://gbv.github.io/cocoda-sdk/LocalMappingsProvider.html#postMapping)

#### `registry.postMappings`
- [BaseProvider - postMappings](https://gbv.github.io/cocoda-sdk/BaseProvider.html#postMappings)

#### `registry.putMapping`
- [MappingsApiProvider - putMapping](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#putMapping)
- [LocalMappingsProvider - putMapping](https://gbv.github.io/cocoda-sdk/LocalMappingsProvider.html#putMapping)

#### `registry.patchMapping`
- [MappingsApiProvider - patchMapping](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#patchMapping)
- [LocalMappingsProvider - patchMapping](https://gbv.github.io/cocoda-sdk/LocalMappingsProvider.html#patchMapping)

#### `registry.deleteMapping`
- [MappingsApiProvider - deleteMapping](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#deleteMapping)
- [LocalMappingsProvider - deleteMapping](https://gbv.github.io/cocoda-sdk/LocalMappingsProvider.html#deleteMapping)

#### `registry.deleteMappings`
- [BaseProvider - deleteMappings](https://gbv.github.io/cocoda-sdk/BaseProvider.html#deleteMappings)

### Registry Methods - Annotations

#### `registry.getAnnotations`
- [MappingsApiProvider - getAnnotations](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#getAnnotations)

#### `registry.postAnnotation`
- [MappingsApiProvider - postAnnotation](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#postAnnotation)

#### `registry.putAnnotation`
- [MappingsApiProvider - putAnnotation](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#putAnnotation)

#### `registry.patchAnnotation`
- [MappingsApiProvider - patchAnnotation](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#patchAnnotation)

#### `registry.deleteAnnotation`
- [MappingsApiProvider - deleteAnnotation](https://gbv.github.io/cocoda-sdk/MappingsApiProvider.html#deleteAnnotation)

### Registry Methods - Various

#### `registry.getOccurrences`
- [OccurrencesApiProvider - getOccurrences](https://gbv.github.io/cocoda-sdk/OccurrencesApiProvider.html#getOccurrences)

#### `registry.getTypes`
- [ConceptApiProvider - getTypes](https://gbv.github.io/cocoda-sdk/ConceptApiProvider.html#getTypes)
- [SkosmosApiProvider - getTypes](https://gbv.github.io/cocoda-sdk/SkosmosApiProvider.html#getTypes)

## Errors
`cocoda-sdk` defines some custom errors.

```js
const errors = require("cocoda-sdk/errors")
```

The following errors are defined:
- `CDKError` - generic error
- `MethodNotImplementedError` - called method is available, but not implemented by the provider
- `InvalidOrMissingParameterError` - a parameter is missing or invalid
- `BackendError` - a response was received, but there was a problem on the backend
- `BackendUnavailableError` - no response was received, but the client's internet connection seems to be working
- `NetworkError` - there was a problem with the network
- `InvalidRequestError` - the request was invalid
- `MissingApiUrlError` - the API URL necessary to make this request is not defined on the registry

For details about the errors, refer to the [documentation](https://gbv.github.io/cocoda-sdk/index.html).

## Maintainers
- [@stefandesu](https://github.com/stefandesu)
- [@nichtich](https://github.com/nichtich)

## Contribute
PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License
MIT Copyright (c) 2020 Verbundzentrale des GBV (VZG)

[jskos-server]: https://github.com/gbv/jskos-server
