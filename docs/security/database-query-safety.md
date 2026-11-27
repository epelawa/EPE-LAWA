# Database query safety

Use Supabase's query builder or RPC calls with named arguments for application data. Treat every value from a URL, form, cookie, or provider response as untrusted. Do not build SQL by concatenating request data into a query string.

## PostgREST filters

Supabase `.eq()`, `.in()`, and ordinary filter methods serialize values as request parameters. `.or()` is different: it accepts a fragment of PostgREST filter grammar. Never interpolate a raw search term into that grammar. Use the application helper `frontend/apps/main/lib/postgrest-search.ts` with literal, bounded search terms and fixed column names. Keep identifiers and sort choices in code-owned allowlists; user-provided values must not select table names, columns, or SQL operators.

```ts
const filter = buildOrIlikeContains(["name", "description"], userSearch);
if (filter) query = query.or(filter);
```

The helper bounds the term, removes control characters, escapes LIKE wildcards, quotes filter values, and rejects non-identifier column names. Continue validating query length and business semantics at each route boundary.

## PostgreSQL functions and migrations

Pass data as function parameters and use PL/pgSQL variables. If dynamic SQL is unavoidable, quote identifiers with `format('%I', identifier)` and bind values with `EXECUTE ... USING value`; never put user data into `%s` or concatenate it into executable SQL. `SECURITY DEFINER` functions also need narrowly scoped grants, a fixed safe `search_path`, and authorization checks before writes.

Review any dynamic DDL separately: identifiers and definitions must originate from trusted schema metadata or fixed code, not request values. Do not treat parameterized calls as authorization; row-level security and function permissions still govern access.

## Audit note

This review found no application query that interpolates request text into raw SQL. It did find free-text search values assembled into PostgREST `.or()` expressions; the public directory pages and shared site search now use the shared quoted/escaped helper. Query-builder `.ilike()` values are passed as request parameters, and the identified search paths also escape LIKE wildcards for literal search semantics. That is a filter-language hardening measure, not a claim that every database path is vulnerability-free; future queries and migrations still require review and tests.
