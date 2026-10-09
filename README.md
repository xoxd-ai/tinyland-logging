# @tummycrypt/tinyland-logging

Structured logging with Loki integration, OpenTelemetry trace correlation,
admin audit logging, file-based admin activity logging and accessibility
(WCAG) Loki logging.

## Entry points

| Import | Contents |
|---|---|
| `@tummycrypt/tinyland-logging` | structured and Loki loggers, admin file/flat audit loggers, configuration |
| `@tummycrypt/tinyland-logging/a11y` | buffered accessibility logger (`a11yLogger`) and its configuration; formerly `@tummycrypt/tinyland-a11y-logger` |
| `@tummycrypt/tinyland-logging/activity` | file-based admin activity logger (`AdminActivityLogger`, `logAdminAction`) with query and rotation, and its configuration; formerly `@tummycrypt/tinyland-activity-logger` |

## Consuming (Bazel only)

This package is not published to npm. Consume it from
[xoxd-ai/bazel-registry](https://github.com/xoxd-ai/bazel-registry):

```starlark
bazel_dep(name = "tummycrypt_tinyland_logging", version = "1.1.0")
```

```starlark
load("@aspect_rules_js//npm:defs.bzl", "npm_link_package")

npm_link_package(
    name = "node_modules/@tummycrypt/tinyland-logging",
    src = "@tummycrypt_tinyland_logging//:pkg",
)
```

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
bazel build //:pkg && bazel test //...
```

TypeScript 7.0.2 and vitest 5.0.3 are pinned exactly. See CHANGELOG.md.
