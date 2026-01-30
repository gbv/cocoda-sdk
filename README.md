# JSKOS Providers

*This is currently being refactored, so the document is outdated!*

This has been split from cocoda-sdk.

[![Test and build](https://github.com/gbv/jskos-provider/actions/workflows/test-and-build.yml/badge.svg)](https://github.com/gbv/jskos-provider/actions/workflows/test-and-build.yml)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/jskos-provider.svg?label=version)](https://github.com/gbv/jskos-provider)
[![NPM package name](https://img.shields.io/badge/npm-cocoda--sdk-blue.svg)](https://www.npmjs.com/package/jskos-provider)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> Access [JSKOS] data with a uniform API

## Table of Contents <!-- omit in toc -->
- [Install](#install)
- [Usage](#usage)
  - [Import](#import)
  - [v1 Compatibility](#v1-compatibility)
  - [Configuration](#configuration)
  - [Registries](#registries)
  - [Providers](#providers)
  - [Multiple Instances](#multiple-instances)
  - [Authenticated Requests](#authenticated-requests)
- [Methods](#methods)
  - [Methods for jskos-provider instance](#methods-for-jskos-provider-instance)
  - [Registry Methods - General](#registry-methods---general)
  - [Registry Methods - Concept Schemes](#registry-methods---concept-schemes)
  - [Registry Methods - Concepts](#registry-methods---concepts)
  - [Registry Methods - Concordances](#registry-methods---concordances)
  - [Registry Methods - Mappings](#registry-methods---mappings)
  - [Registry Methods - Annotations](#registry-methods---annotations)
  - [Registry Methods - Various](#registry-methods---various)
- [Errors](#errors)
- [Maintainers](#maintainers)
- [Publish](#publish)
- [Contribute](#contribute)
- [License](#license)

## Install

...

## Usage

...

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
import { cdk, LocalMappingsProvider } from "jskos-provider"
// Local mappings are not included by default
cdk.addProvider(LocalMappingsProvider)
const registry = cdk.initializeRegistry({
  uri: "http://coli-conc.gbv.de/registry/local-mappings",
  provider: "LocalMappings"
})
// Now, access methods are available on the registry:
registry.getMappings()
```


### Providers

Providers allow access to different types of APIs.

The following providers are offered in jskos-provider by default:
- `Base` - the base provider that all other providers have to inherit from
- `ConceptApi` - access to concept schemes and concepts via JSKOS API ([jskos-server] and compatible implementations)
- `MappingsApi` - access to concordances, mappings, and annotations via [jskos-server]

The following providers are also exported, but have to be added via `cdk.addProvider`:
- `LocalMappings` - access to local mappings via [localForage](https://github.com/localForage/localForage) (only available in browser)
- `SkosmosApi` - access to concept schemes and concepts via a [Skosmos](https://github.com/NatLibFi/Skosmos) API
- `LocApi` - access to concept schemes and concepts via the [Library of Congress Linked Data Service](https://id.loc.gov/)
  - **This integration is currently experimental and only supports LCSH and LCNAF.**
- `Skohub` - access to concept schemes and concepts via a [SkoHub Vocabs](https://blog.lobid.org/2019/09/27/presenting-skohub-vocabs.html)
  - **This integration is currently experimental. Only vocabularies that use a [slash namespace pattern]([hash](https://www.w3.org/2001/sw/BestPractices/VM/http-examples/2006-01-18/#slash)) with dereferenceable URIs are supported.**
- `LobidApi` - access to GND via [lobid](https://lobid.org)
  - **This integration is currently experimental.**
- `MyCoRe` - access to vocabularies via [MyCoRe](https://www.mycore.de/)
  - **This integration is currently experimental. Only one vocabulary per registry is supported. Not recommended for large vocabularies as all of the vocabulary data is loaded and kept in memory.**
- `ReconciliationApi` - access to mapping suggestions via a [Reconciliation Service API](https://reconciliation-api.github.io/specs/draft/)
- `OccurrencesApi` - access to concept occurrences via [occurrences-api](https://github.com/gbv/occurrences-api) (will be changed to [occurrences-server](https://github.com/gbv/occurrences-server) in the future)
- `LabelSearchSuggestion` - access to mapping suggestions using other registries' search endpoints (using [jskos-server])

To add a provider, append `Provider` to its name and import it together with `cdk`:

```js
import { cdk, LocApiProvider } from "jskos-provider"
cdk.addProvider(LocApiProvider)
```

Note that in the browser bundle, all providers listed above are included and do not have to be added separately.

Please refer to each provider's documentation for how exactly to configure that provider: [Documentation](https://gbv.github.io/jskos-provider/)

#### Custom providers

It is also possible to add custom providers that inherit from BaseProvider:

```js
import { BaseProvider } from "jskos-provider"

export class CustomProvider extends BaseProvider {
  static providerName = "Dummy" 
  // static providerType = "..."    // Optional URI from https://bartoc.org/api-type/

  getConcepts() {
    return [
      { prefLabel: { en: "Hello!" } },
    ]
  }
}
```

See [`examples/custom-provider.js`](https://github.com/gbv/jskos-provider/blob/main/examples/custom-provider.js) for an extended example.


### Authenticated Requests
The following is a barebones example on how to use jskos-provider together with [`login-client`](https://github.com/gbv/login-client).

Prerequisites:
- A local instance of [Login Server](https://github.com/gbv/login-server) running on `localhost:3004`
  - Needs a configured identity provider with at least one user
  - The HTTP server that is serving the example below must be configured under `ALLOWED_ORIGINS`
  - The user must already be logged in
- A local instance of [JSKOS Server](https://github.com/gbv/jskos-server) running on `localhost:3000`
  - The Login Server's public key must be configured
  - Mappings must be enabled for authenticated users (is given for the default configuration)

See also the code comments inside the example.

<!-- TODO: Offer modern ESM example. -->

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Test</title>
</head>
<body>
<!-- login-client, jskos-provider -->
<script src="https://cdn.jsdelivr.net/npm/gbv-login-client@0"></script>
<script src="https://cdn.jsdelivr.net/npm/jskos-provider@2"></script>
<script>
// Initialize mapping registry at localhost:3000
const registry = CDK.cdk.initializeRegistry({
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
  - Cocoda is using jskos-provider extensively, so other parts of the code might also be helpful. It has gotten pretty big and complex though.
- The [API page of Login Server](https://github.com/gbv/login-server/blob/main/views/api.ejs). This is merely an example on how to use `login-client`.

## Methods

A jskos-provider instance itself offers only a handful of methods. The actual access to APIs happens through [registries](#registries). The following list of methods assume either an instance of jskos-provider (`cdk.someMethod`) or an initialized registry (`registry.someMethod`). Documentation for registry methods is on a per-provider basis. While the API should be the same for a particular methods across providers, the details on how to use it might differ.

### Registry Methods - General

#### `registry.init`
- [BaseProvider - init](https://gbv.github.io/jskos-provider/BaseProvider.html#init)

#### `registry.isAuthorizedFor`
- [BaseProvider - isAuthorizedFor](https://gbv.github.io/jskos-provider/BaseProvider.html#isAuthorizedFor)

#### `registry.supportsScheme`
- [BaseProvider - supportsScheme](https://gbv.github.io/jskos-provider/BaseProvider.html#supportsScheme)
- [LabelSearchSuggestionProvider - supportsScheme](https://gbv.github.io/jskos-provider/LabelSearchSuggestionProvider.html#supportsScheme)

#### `registry.setAuth`
- [BaseProvider - setAuth](https://gbv.github.io/jskos-provider/BaseProvider.html#setAuth)

#### `registry.setRetryConfig`
- [BaseProvider - setRetryConfig](https://gbv.github.io/jskos-provider/BaseProvider.html#setRetryConfig)

#### `registry.getCancelTokenSource`
- [BaseProvider - getCancelTokenSource](https://gbv.github.io/jskos-provider/BaseProvider.html#getCancelTokenSource)

### Registry Methods - Concept Schemes

#### `registry.getSchemes`
- [ConceptApiProvider - getSchemes](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#getSchemes)
- [SkosmosApiProvider - getSchemes](https://gbv.github.io/jskos-provider/SkosmosApiProvider.html#getSchemes)

#### `registry.vocSearch`
- [ConceptApiProvider - vocSearch](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#vocSearch)

#### `registry.vocSuggest`
- [ConceptApiProvider - vocSuggest](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#vocSuggest)

### Registry Methods - Concepts

#### `registry.getTop`
- [ConceptApiProvider - getTop](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#getTop)

#### `registry.getConcepts`
- [ConceptApiProvider - getConcepts](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#getConcepts)
- [SkosmosApiProvider - getConcepts](https://gbv.github.io/jskos-provider/SkosmosApiProvider.html#getConcepts)

#### `registry.getNarrower`
- [ConceptApiProvider - getNarrower](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#getNarrower)
- [SkosmosApiProvider - getNarrower](https://gbv.github.io/jskos-provider/SkosmosApiProvider.html#getNarrower)

#### `registry.getAncestors`
- [ConceptApiProvider - getAncestors](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#getAncestors)
- [SkosmosApiProvider - getAncestors](https://gbv.github.io/jskos-provider/SkosmosApiProvider.html#getAncestors)

#### `registry.search`
- [ConceptApiProvider - search](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#search)
- [SkosmosApiProvider - search](https://gbv.github.io/jskos-provider/SkosmosApiProvider.html#search)

#### `registry.suggest`
- [ConceptApiProvider - suggest](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#suggest)
- [SkosmosApiProvider - suggest](https://gbv.github.io/jskos-provider/SkosmosApiProvider.html#suggest)

### Registry Methods - Concordances

#### `registry.getConcordances`
- [MappingsApiProvider - getConcordances](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#getConcordances)

#### `registry.postConcordance`
- [MappingsApiProvider - postConcordance](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#postConcordance)

#### `registry.putConcordance`
- [MappingsApiProvider - putConcordance](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#putConcordance)

#### `registry.patchConcordance`
- [MappingsApiProvider - patchConcordance](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#patchConcordance)

#### `registry.deleteConcordance`
- [MappingsApiProvider - deleteConcordance](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#deleteConcordance)

### Registry Methods - Mappings

#### `registry.getMappings`
- [MappingsApiProvider - getMappings](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#getMappings)
- [LocalMappingsProvider - getMappings](https://gbv.github.io/jskos-provider/LocalMappingsProvider.html#getMappings)
- [ReconciliationApiProvider - getMappings](https://gbv.github.io/jskos-provider/ReconciliationApiProvider.html#getMappings)
- [LabelSearchSuggestionProvider - getMappings](https://gbv.github.io/jskos-provider/LabelSearchSuggestionProvider.html#getMappings)
- [OccurrencesApiProvider - getMappings](https://gbv.github.io/jskos-provider/OccurrencesApiProvider.html#getMappings)

#### `registry.getMapping`
- [MappingsApiProvider - getMapping](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#getMapping)
- [LocalMappingsProvider - getMapping](https://gbv.github.io/jskos-provider/LocalMappingsProvider.html#getMapping)

#### `registry.postMapping`
- [MappingsApiProvider - postMapping](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#postMapping)
- [LocalMappingsProvider - postMapping](https://gbv.github.io/jskos-provider/LocalMappingsProvider.html#postMapping)

#### `registry.postMappings`
- [BaseProvider - postMappings](https://gbv.github.io/jskos-provider/BaseProvider.html#postMappings)

#### `registry.putMapping`
- [MappingsApiProvider - putMapping](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#putMapping)
- [LocalMappingsProvider - putMapping](https://gbv.github.io/jskos-provider/LocalMappingsProvider.html#putMapping)

#### `registry.patchMapping`
- [MappingsApiProvider - patchMapping](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#patchMapping)
- [LocalMappingsProvider - patchMapping](https://gbv.github.io/jskos-provider/LocalMappingsProvider.html#patchMapping)

#### `registry.deleteMapping`
- [MappingsApiProvider - deleteMapping](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#deleteMapping)
- [LocalMappingsProvider - deleteMapping](https://gbv.github.io/jskos-provider/LocalMappingsProvider.html#deleteMapping)

#### `registry.deleteMappings`
- [BaseProvider - deleteMappings](https://gbv.github.io/jskos-provider/BaseProvider.html#deleteMappings)

### Registry Methods - Annotations

#### `registry.getAnnotations`
- [MappingsApiProvider - getAnnotations](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#getAnnotations)

#### `registry.postAnnotation`
- [MappingsApiProvider - postAnnotation](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#postAnnotation)

#### `registry.putAnnotation`
- [MappingsApiProvider - putAnnotation](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#putAnnotation)

#### `registry.patchAnnotation`
- [MappingsApiProvider - patchAnnotation](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#patchAnnotation)

#### `registry.deleteAnnotation`
- [MappingsApiProvider - deleteAnnotation](https://gbv.github.io/jskos-provider/MappingsApiProvider.html#deleteAnnotation)

### Registry Methods - Various

#### `registry.getOccurrences`
- [OccurrencesApiProvider - getOccurrences](https://gbv.github.io/jskos-provider/OccurrencesApiProvider.html#getOccurrences)

#### `registry.getTypes`
- [ConceptApiProvider - getTypes](https://gbv.github.io/jskos-provider/ConceptApiProvider.html#getTypes)
- [SkosmosApiProvider - getTypes](https://gbv.github.io/jskos-provider/SkosmosApiProvider.html#getTypes)

## Errors
jskos-providers defines some custom errors.

```js
import { errors } from "jskos-provider"
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

For details about the errors, refer to the [documentation](https://gbv.github.io/jskos-provider/index.html).

## Maintainers

- [@nichtich](https://github.com/nichtich)

## Publish

Please work on the `dev` branch or on a dedicated feature branch during development and only merge into main for releases!

## Contribute

Contributions are welcome!

## License

MIT Copyright (c) 2026 Verbundzentrale des GBV (VZG)

[jskos-server]: https://github.com/gbv/jskos-server
[JSKOS]: https://gbv.github.io/jskos/

