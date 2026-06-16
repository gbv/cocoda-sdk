# 3.7.0

- Remove addition of mapping identifiers in `adjustMapping`, called in methods `getMapping`, `getMappings`, `postMapping`, `postMappings`, `putMapping`, `putMapping`, `patchMapping`. Clients MUST take care to add identifiers with function `addMappingIdentifiers` from jskos-tools, if needed.
- Fix `isAuthorizedFor`
