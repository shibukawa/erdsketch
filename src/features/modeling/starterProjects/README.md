# Starter projects

Each non-empty starter project is a declarative `ProjectSpec` in its own file. The shared factory in `../starterProjects.ts` turns these definitions into complete ERD, DFD, domain, and vocabulary state.

## Add a starter

1. Copy one of `todo.ts`, `blog.ts`, or `helpDesk.ts` and give its exported spec a unique literal `id`.
2. Import the new spec in `registry.ts` and add it to `projectSpecs`.

The `StarterProjectId` type, launch-panel metadata, counts, and project-state generation are derived automatically. No union type or UI list needs to be edited.

## Remove a starter

Remove its import and entry from `projectSpecs` in `registry.ts`, then delete its definition file.

`empty` is built into the shared factory and intentionally does not appear in the registry.

## Definition checks

Run `npm test`. The generic starter tests validate every registered definition, including unique IDs and domains, assigned field domains, complete vocabulary bindings, valid ERD relationships, populated DFD flows, metadata counts, and independent state creation.
