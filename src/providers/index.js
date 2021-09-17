import * as errors from "../errors/index.js"
import BaseProvider from "./base-provider.js"

import LocalMappingsProvider from "./local-mappings-provider.js"
import MappingsApiProvider from "./mappings-api-provider.js"
import OccurrencesApiProvider from "./occurrences-api-provider.js"
import ConceptApiProvider from "./concept-api-provider.js"
import ReconciliationApiProvider from "./reconciliation-api-provider.js"
import LabelSearchSuggestionProvider from "./label-search-suggestion-provider.js"
import SkosmosApiProvider from "./skosmos-api-provider.js"
import LocApiProvider from "./loc-api-provider.js"

let providers = {
  [BaseProvider.providerName]: BaseProvider,
  init(registry) {
    if (this[registry.provider]) {
      return new this[registry.provider](registry)
    }
    throw new errors.InvalidProviderError()
  },
  addProvider(provider) {
    if (provider.prototype instanceof providers[BaseProvider.providerName]) {
      this[provider.providerName] = provider
    } else {
      throw new errors.InvalidProviderError()
    }
  },
}

for (let provider of [
  LocalMappingsProvider,
  MappingsApiProvider,
  OccurrencesApiProvider,
  ConceptApiProvider,
  ReconciliationApiProvider,
  LabelSearchSuggestionProvider,
  SkosmosApiProvider,
  LocApiProvider,
]) {
  providers.addProvider(provider)
}

// TODO: Named exports!
export { providers }
