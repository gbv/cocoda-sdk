# 3.8.3

- Rollback of 3.8.0 to 3.8.2
- Update jskos-tools to 1.3.0
- Unify axios calls in preparation of migration
- Add MeSH API provider
- Add generic timeout parameter

# 3.8.0 to 3.8.2

- These broke Cocoda by incomplete migration from axios to fetch

# 3.7.0

- Remove addition of mapping identifiers in `adjustMapping`, called in methods `getMapping`, `getMappings`, `postMapping`, `postMappings`, `putMapping`, `putMapping`, `patchMapping`. Clients MUST take care to add identifiers with function `addMappingIdentifiers` from jskos-tools, if needed.
- Fix `isAuthorizedFor`
