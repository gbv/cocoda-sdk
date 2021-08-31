# Cocoda SDK
![Node.js CI](https://github.com/gbv/cocoda-sdk/workflows/Node.js%20CI/badge.svg)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/cocoda-sdk.svg?label=version)](https://github.com/gbv/cocoda-sdk)
[![NPM package name](https://img.shields.io/badge/npm-cocoda--sdk-blue.svg)](https://www.npmjs.com/package/cocoda-sdk)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> SDK for [Cocoda](https://github.com/gbv/cocoda) and [coli-conc](https://coli-conc.gbv.de/) services

## Table of Contents <!-- omit in toc -->
- [Install](#install)
- [Usage](#usage)
  - [Import](#import)
  - [Configuration](#configuration)
  - [Registries](#registries)
  - [Providers](#providers)
  - [Multiple Instances](#multiple-instances)
  - [Authenticated Requests](#authenticated-requests)
- [Methods](#methods)
  - [Methods for `cocoda-sdk` instance](#methods-for-cocoda-sdk-instance)
  - [Registry Methods - General](#registry-methods---general)
  - [Registry Methods - Concept Schemes](#registry-methods---concept-schemes)
  - [Registry Methods - Concepts](#registry-methods---concepts)
  - [Registry Methods - Mappings](#registry-methods---mappings)
  - [Registry Methods - Annotations](#registry-methods---annotations)
  - [Registry Methods - Various](#registry-methods---various)
- [Errors](#errors)
- [Maintainers](#maintainers)
- [Publish](#publish)
- [Contribute](#contribute)
- [License](#license)

## Install
```bash
npm i cocoda-sdk
```

We are also providing browser bundles:
- Development (not minified, ~97K): https://cdn.jsdelivr.net/npm/cocoda-sdk/dist/cocoda-sdk.js
- Production (minified, ~40K): https://cdn.jsdelivr.net/npm/cocoda-sdk@1

[![](https://data.jsdelivr.com/v1/package/npm/cocoda-sdk/badge?style=rounded)](https://www.jsdelivr.com/package/npm/cocoda-sdk)

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

#### Endpoint Determination
For many providers, you need to specify one or more endpoints on the registry object for it to work. There are, however, three steps in which these endpoints are determined:

1. By explicitly specifying an endpoint on the registry object.
2. By performaning a request to the provider's `/status` endpoint and parsing its result (which is done in `registry.init()`).
3. By implication using the `api` base URL.

Values set earlier in these steps will never be overwritten by later steps. That means to disable an endpoint explicitly, you can set it to `null` when configuring the registry. Also, if step 2 is successful, it will be assumed that no further endpoints exist and all missing endpoints will be set to `null`, i.e. essentially skipping step 3.

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
- `LocApi` - access to concept schemes and concepts via the [Library of Congress Linked Data Service](https://id.loc.gov/)
  - **This integration is currently experimental and only supports LCSH and LCNAF.**
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

### Authenticated Requests
The following is a barebones example on how to use `cocoda-sdk` together with [`login-client`](https://github.com/gbv/login-client).

Prerequisites:
- A local instance of [Login Server](https://github.com/gbv/login-server) running on `localhost:3004`
  - Needs a configured identity provider with at least one user
  - The HTTP server that is serving the example below must be configured under `ALLOWED_ORIGINS`
  - The user must already be logged in
- A local instance of [JSKOS Server](https://github.com/gbv/jskos-server) running on `localhost:3000`
  - The Login Server's public key must be configured
  - Mappings must be enabled for authenticated users (is given for the default configuration)

See also the code comments inside the example.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Test</title>
</head>
<body>
<!-- login-client, cocoda-sdk -->
<script src="https://cdn.jsdelivr.net/npm/gbv-login-client"></script>
<script src="https://cdn.jsdelivr.net/npm/cocoda-sdk"></script>
<script>
// Initialize mapping registry at localhost:3000
const registry = cdk.initializeRegistry({
  provider: "MappingsApi",
  uri: "local:mappings",
  status: "http://localhost:3000/status",
})
// Note: This is an async function, so we might be dealing with race conditions here.
registry.init()
// Create client to connect to Login Server at localhost:3004
let client = new LoginClient("localhost:3004", { ssl: false })
let user
// Add listener for all event types
client.addEventListener(null, event => {
  switch (event.type) {
    case LoginClient.events.connect:
      // At this point, we don't know whether the user has logged in yet, but we can try
      console.log(registry.isAuthorizedFor({ type: "mappings", action: "create", user }))
      break
    case LoginClient.events.login:
      // Update user
      user = event.user
      // Now we know the user is logged in, so this should return true
      // Note that if the user is already logged in, this event will fire before connected
      console.log(registry.isAuthorizedFor({ type: "mappings", action: "create", user }))
      break
    case LoginClient.events.update:
      // Update user
      user = event.user
      break
    case LoginClient.events.about:
      // Register the server's public key in the registry
      registry.setAuth({ key: event.publicKey })
      break
    case LoginClient.events.token:
      // On every token update, update the token in the registry
      registry.setAuth({ bearerToken: event.token })
      break
  }
})
// Start connection to client
client.connect()
</script>
</body>
</html>
```

Note that for a real application, there are more things necessary:
- Track whether the client is connected and whether the user is logged in
- Tell the user to log in if necessary
- Check if the `registry.init()` call finished before making requests (might not be necessary because requests will wait for initialization)
- Error handling
- etc.

You can find more in-depth examples here:
- The [Vuex store module for authentication in Cocoda](https://github.com/gbv/cocoda/blob/dev/src/store/modules/auth.js).
  - Even if you're not using Vue.js, this can be helpful.
  - Cocoda is using `cocoda-sdk` extensively, so other parts of the code might also be helpful. It has gotten pretty big and complex though.
- The [API page of Login Server](https://github.com/gbv/login-server/blob/master/views/api.ejs). This is merely an example on how to use `login-client`.

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

## Publish
Please work on the `dev` branch during development (or better yet, develop in a feature branch and merge into `dev` when ready).

When a new release is ready (i.e. the features are finished, merged into `dev`, and all tests succeed), run the included release script (replace "patch" with "minor" or "major" if necessary):

```bash
npm run release:patch
```

This will:
- Run tests and build to make sure everything works
- Switch to `dev`
- Make sure `dev` is up-to-date
- Run `npm version patch` (or "minor"/"major")
- Push changes to `dev`
- Switch to `master`
- Merge changes from `dev`
- Push `master` with tags
- Switch back to `dev`

After running this, GitHub Actions will automatically publish the new version to npm. It will also create a new GitHub Release draft. Please edit and publish the release manually.

## Contribute
PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License
MIT Copyright (c) 2020 Verbundzentrale des GBV (VZG)

[jskos-server]: https://github.com/gbv/jskos-server
