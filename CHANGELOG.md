# Changelog

## 1.0.0 (2026-10-08)

Major release under the 2026-10-08 estate uplift (RU1, RU6, RU8, RU10, RU13).

### Added

- `@tummycrypt/tinyland-logging/a11y`: the accessibility (WCAG, contrast,
  ARIA) Loki logger formerly published as `@tummycrypt/tinyland-a11y-logger`
  0.2.x. The API is unchanged: `a11yLogger`, `configureA11yLogger`,
  `getA11yLoggerConfig`, `resetA11yLoggerConfig`, the test helpers and the
  label types.

### Changed (breaking for build and distribution, not for the runtime API)

- Toolchain: TypeScript 7.0.2 (native compiler) and vitest 5.0.3, pinned
  exactly. Bazel builds use `aspect_rules_ts` 3.10.1 with the `typescript`
  extension at 7.0.2.
- `tsconfig.json` lists `"types": ["node"]` explicitly, because TypeScript 6+
  no longer loads every `@types/*` package by default.
- The Bazel npm repository is now `@tummycrypt_tinyland_logging_npm`
  (previously `@npm`, renamed by a registry overlay patch). The registry entry
  for 1.0.0 needs no patch.
- Distribution is Bazel only (RU6): consume the module with
  `bazel_dep(name = "tummycrypt_tinyland_logging", version = "1.0.0")` from
  xoxd-ai/bazel-registry and link `@tummycrypt_tinyland_logging//:pkg` with
  `npm_link_package`. The package is marked `private`, the npm publish
  workflow and `publishConfig` are removed (RU8), and built `dist/` files are
  no longer committed.

### Migration

1. Re-pin: `bazel_dep(name = "tummycrypt_tinyland_logging", version = "1.0.0")`
   and pin the registry commit that carries it.
2. Replace `@tummycrypt/tinyland-a11y-logger` imports with
   `@tummycrypt/tinyland-logging/a11y`, then drop the
   `tummycrypt_tinyland_a11y_logger` bazel_dep and its `npm_link_package`.
3. Root-entry exports are unchanged; no code change is needed for them.
4. If your root module pins TypeScript through the deprecated rules_ts `ext`
   extension, nothing changes for you; if it uses the `typescript` extension,
   the root version wins for every module in the graph.
