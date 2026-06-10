# Data Pipeline Test Harness

[![CI](https://github.com/webdevmeg42/seedling/actions/workflows/ci.yml/badge.svg)](https://github.com/webdevmeg42/seedling/actions/workflows/ci.yml)

A Node.js project that generates order fulfillment seed data, inserts it into SQLite, runs multi-stage pipeline transformations, and validates output integrity with named assertions.

## Why I built this

I'm an SDET with 4.5 years of experience at a database-heavy organization. Most of my testing work lives close to the data layer — validating transforms, catching referential integrity failures, and asserting that data stays correct as it moves through the system. I built this to have a public artifact that shows pipeline testing as a discipline: not just "does the function return the right value," but "does the data hold together end-to-end."

## What it demonstrates

- Seed data generation with realistic order fulfillment variance (no faker dependency)
- Multi-stage SQL transforms: normalization (order totals), daily aggregation, ETL staging
- Named assertion-based validation with a structured report object
- Isolated unit tests per pipeline stage using Node's built-in `node:test`
- End-to-end integration test that proves the full pipeline produces valid output
- GitHub Actions CI: lint gate before test gate on every push and pull request

## Setup

```bash
nvm use        # or: ensure node >= 22
npm ci
npm test
```

To run the full pipeline and see the summary output:

```bash
npm run pipeline
```

## Sample output

```
Pipeline run: 50 orders seeded
✓ normalize    50 order_totals written
✓ aggregate    31 daily summaries written
✓ stage        164 clean / 0 flagged invalid
✓ validate     6/6 checks passed
```

## Project structure

```
src/
  db.js                    schema bootstrap + SQLite connection factory
  seeder/index.js          generates customers, products, orders, order_items
  transformer/
    normalize.js           computes order_totals (subtotal, 8.5% tax, total) via SQL INSERT…SELECT
    aggregate.js           rolls up daily_order_summary, excludes cancelled orders
    stage.js               ETL: staging_raw → staging_clean → reporting_orders
  validator/index.js       6 named integrity checks, returns { passed, failed, checks }
  pipeline.js              composes all stages in order, prints run summary

test/
  db.test.js
  seeder.test.js
  transformer/
    normalize.test.js
    aggregate.test.js
    stage.test.js
  validator.test.js
  pipeline.integration.test.js
```
