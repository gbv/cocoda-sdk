
let providers = {}

const BaseProvider = require("./base-provider")
providers[BaseProvider.providerName] = BaseProvider

const LocalMappingsProvider = require("./local-mappings-provider")
providers[LocalMappingsProvider.providerName] = LocalMappingsProvider

const MappingsApiProvider = require("./mappings-api-provider")
providers[MappingsApiProvider.providerName] = MappingsApiProvider

const OccurrencesApiProvider = require("./occurrences-api-provider")
providers[OccurrencesApiProvider.providerName] = OccurrencesApiProvider

const ConceptApiProvider = require("./concept-api-provider")
providers[ConceptApiProvider.providerName] = ConceptApiProvider

const ReconciliationApiProvider = require("./reconciliation-api-provider")
providers[ReconciliationApiProvider.providerName] = ReconciliationApiProvider

const SearchSuggestionProvider = require("./search-suggestion-provider")
providers[SearchSuggestionProvider.providerName] = SearchSuggestionProvider

const SkosmosApiProvider = require("./skosmos-api-provider")
providers[SkosmosApiProvider.providerName] = SkosmosApiProvider

// Add more providers here.

module.exports = providers
