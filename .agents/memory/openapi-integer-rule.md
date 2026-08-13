---
name: OpenAPI Integer Rule
description: All numeric fields in openapi.yaml must use type:number, never type:integer
---

## Rule
In `lib/api-spec/openapi.yaml`, use `type: number` for ALL numeric fields.
Never use `type: integer`.

**Why:** Orval code-generation with zod v3 emits `zod.number().int()` for integer fields, but zod v3 does not have `.int()` — this causes a TypeScript compile error during codegen.

**How to apply:** Every time openapi.yaml is edited, verify no field uses `type: integer`. Nullable numbers use `type: ["number", "null"]`.
