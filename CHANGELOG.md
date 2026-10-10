# Changelog

## 1.3.0 (2026-10-10)

Minor release: one additive subpath export. The toolchain and stack are the
same as 1.0.0 (TypeScript 7.0.2, vitest 5.0.3), so this is not a major bump.

### Added

- `@tummycrypt/tinyland-logging/middleware`: the tRPC-compatible logging
  middleware with DI-based logger injection formerly published as
  `@tummycrypt/tinyland-logging-middleware` 0.2.x (registry module
  `tummycrypt_tinyland_logging_middleware`, now retired). The API is
  unchanged: `configure`, `getConfig`, `resetConfig`, `getNoopLogger`,
  `loggingMiddleware`, `createLogger`, `createScopedLogger` and the
  `LogLevel`, `LogContext`, `Logger` and `LoggingMiddlewareConfig` types.
  It is a subpath, not part of the root entry, because the root already
  exports different `LogLevel`, `LogContext`, `getNoopLogger` and
  `createScopedLogger`. The root entry and the other subpaths are unchanged.

### Migration

1. Re-pin: `bazel_dep(name = "tummycrypt_tinyland_logging", version = "1.3.0")`
   and pin the registry commit that carries it.
2. Replace `@tummycrypt/tinyland-logging-middleware` imports (and `vi.mock`
   targets) with `@tummycrypt/tinyland-logging/middleware`, then drop the
   `tummycrypt_tinyland_logging_middleware` bazel_dep and its
   `npm_link_package`.
3. Runtime behaviour is identical: the module-level configuration is a no-op
   logger until `configure({ logger })` is called, and this subpath keeps its
   own configuration, separate from the root entry's.

## 1.2.0 (2026-10-09)

Minor release: one additive subpath export. The toolchain and stack are the
same as 1.0.0 (TypeScript 7.0.2, vitest 5.0.3), so this is not a major bump.

### Added

- `@tummycrypt/tinyland-logging/admin-audit`: the SvelteKit admin action audit
  logger formerly published as `@tummycrypt/tinyland-admin-audit` 0.2.x
  (registry module `tummycrypt_tinyland_admin_audit`, now retired). The API is
  unchanged: `configureAdminAudit`, `getAdminAuditConfig`,
  `resetAdminAuditConfig`, `extractClientContext`, `calculateChangedFields`,
  `logAdminAction`, `logAdminActionFailure`, `logUserManagement`,
  `logPermissionChange`, `logContentManagement` and the `Logger`,
  `AuditRequestEvent`, `AdminAuditPackageConfig`, `AdminAction`,
  `ResourceType`, `DeviceType`, `AdminAuditLog` and `AdminAuditOptions` types.
  It is a subpath, not part of the root entry, because the root already
  exports a different `logAdminAction` (the flat file logger). The root entry
  and the other subpaths are unchanged.

### Migration

1. Re-pin: `bazel_dep(name = "tummycrypt_tinyland_logging", version = "1.2.0")`
   and pin the registry commit that carries it.
2. Replace `@tummycrypt/tinyland-admin-audit` imports (and `vi.mock` targets)
   with `@tummycrypt/tinyland-logging/admin-audit`, then drop the
   `tummycrypt_tinyland_admin_audit` bazel_dep and its `npm_link_package`.
3. Runtime behaviour is identical, including the default configuration
   (console logger, identity IP hash, `unknown` device type) until
   `configureAdminAudit` is called.

## 1.1.0 (2026-10-09)

Minor release: one additive subpath export. The toolchain and stack are the
same as 1.0.0 (TypeScript 7.0.2, vitest 5.0.3), so this is not a major bump.

### Added

- `@tummycrypt/tinyland-logging/activity`: the file-based admin activity
  logger formerly published as `@tummycrypt/tinyland-activity-logger` 0.2.x
  (registry module `tummycrypt_tinyland_activity_logger`, now retired). The
  API is unchanged: `AdminActivityLogger`, `getAdminActivityLogger`,
  `resetAdminActivityLoggerInstance`, `logAdminAction`,
  `configureActivityLogger`, `getActivityLoggerConfig`,
  `resetActivityLoggerConfig` and the `ActivityLog`, `UserContext` and
  `ActivityLoggerConfig` types. The root entry and `./a11y` are unchanged.

### Migration

1. Re-pin: `bazel_dep(name = "tummycrypt_tinyland_logging", version = "1.1.0")`
   and pin the registry commit that carries it.
2. Replace `@tummycrypt/tinyland-activity-logger` imports with
   `@tummycrypt/tinyland-logging/activity`, then drop the
   `tummycrypt_tinyland_activity_logger` bazel_dep and its
   `npm_link_package`.
3. Runtime behaviour is identical, including the default log path
   (`content/auth/logs/admin-activity.json` under `process.cwd()`).

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
