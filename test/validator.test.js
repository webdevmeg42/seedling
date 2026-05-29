import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/db.js';
import { seed } from '../src/seeder/index.js';
import { normalize } from '../src/transformer/normalize.js';
import { aggregate } from '../src/transformer/aggregate.js';
import { stage } from '../src/transformer/stage.js';
import { validate } from '../src/validator/index.js';

function buildValidDb() {
  const db = createDb();
  seed(db, { count: 10 });
  normalize(db);
  aggregate(db);
  stage(db);
  return db;
}

describe('validator', () => {
  it('passes all 6 checks on a valid pipeline run', () => {
    const db = buildValidDb();
    const report = validate(db);
    assert.strictEqual(report.failed, 0);
    assert.strictEqual(report.checks.length, 6);
    assert.ok(report.checks.every((c) => c.passed));
  });

  it('returns a report with passed count equal to total checks when valid', () => {
    const db = buildValidDb();
    const report = validate(db);
    assert.strictEqual(report.passed, 6);
  });

  it('reports order_totals_row_count failure when normalize has not run', () => {
    const db = createDb();
    seed(db, { count: 5 });
    // deliberately skip normalize — order_totals stays empty
    aggregate(db);
    stage(db);
    const report = validate(db);
    const check = report.checks.find((c) => c.name === 'order_totals_row_count');
    assert.strictEqual(check.passed, false);
    assert.ok(typeof check.message === 'string' && check.message.length > 0);
  });

  it('increments failed count when a check does not pass', () => {
    const db = createDb();
    seed(db, { count: 5 });
    aggregate(db);
    stage(db);
    const report = validate(db);
    assert.ok(report.failed > 0);
  });
});
