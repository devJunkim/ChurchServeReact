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

## Run the application

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Validate the checkpoint

```bash
npm run lint
npm run typecheck
npm test
npm run build
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
