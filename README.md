# ChurchServe React

ChurchServe is a volunteer and ministry scheduling application built as a
production-oriented React tutorial. Each branch advances the same application
through one reviewed checkpoint.

## Part 1

The `part_1` branch establishes an accessible application shell, React Router
routes, responsive styling, and behavior-focused tests.

## Part 2

The `part_2` branch replaces the schedule placeholder with typed service-event
data, reusable cards, callback props, parent-owned selection state, responsive
feature styling, and focused component tests.

## Part 3

The `part_3` branch models loading, error, and ready schedule states with a
TypeScript discriminated union. The schedule page renders accessible loading,
retry, empty, and populated experiences, with behavior-focused tests for each
user-visible branch.

## Part 4

The `part_4` branch adds readonly volunteer-assignment records, pure validation
and reducer logic, immutable state transitions, derived open positions, and a
custom `useAssignmentState` hook with focused domain and hook tests.

## Part 5

The `part_5` branch adds a typed controlled service-event form, pure field and
time-range validation, accessible error feedback, normalized creation commands,
immutable schedule updates, and child-to-parent integration tests.

## Part 6

The `part_6` branch adds shared in-memory event state, dedicated creation and
parameterized detail routes, semantic card links, record-specific missing
content, programmatic post-submit navigation, and route-level tests.

## Part 7

The `part_7` branch puts service-event operations behind a repository contract,
selects an in-memory implementation at the application boundary, bridges its
immutable snapshots into React, and tests the concrete repository in isolation.

## Part 8

The `part_8` branch adds versioned browser persistence behind the existing
repository contract, validates stored JSON before trusting it, repairs invalid
snapshots with seeded data, falls back to in-memory behavior when Web Storage
is unavailable, and verifies the adapter with focused failure-path tests.

## Part 9

The `part_9` branch changes service-event operations to an asynchronous,
abort-aware repository contract. Schedule and detail routes now model real
request states, retries replace failed requests, creation exposes pending and
failure feedback, and route changes cancel obsolete work.

## Part 10

The `part_10` branch adds a fetch-based repository with runtime response
validation and status-aware failures, selects it at the router composition
boundary, and introduces a minimal ASP.NET Core API with thread-safe in-memory
storage, server-side validation, REST status codes, and Vite development
proxying.

## Part 11

The `part_11` branch replaces process-memory API storage with SQLite and Entity
Framework Core. A repository-local EF tool manifest creates a reviewed initial
migration, startup applies pending migrations and seeds only an empty database,
and asynchronous endpoints query and save through a scoped DbContext.

## Part 12

The `part_12` branch adds ASP.NET Core integration tests around the real Minimal
API. Each test host applies the production EF Core migration to an isolated
temporary SQLite database and verifies seeded reads, missing records, validation
failures, creation semantics, and persistence after a host restart.

## Run the application

```bash
npm install
npm run api
```

In a second terminal:

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Validate the checkpoint

```bash
npm run lint
npm run typecheck
npm test
npm run build
dotnet tool restore
dotnet build server/ChurchServe.Api/ChurchServe.Api.csproj --configuration Release
dotnet test server/ChurchServe.Api.Tests/ChurchServe.Api.Tests.csproj --configuration Release
dotnet ef migrations has-pending-model-changes --project server/ChurchServe.Api
```

## Tooling notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
