import { createDb } from './db.js';
import { seed } from './seeder/index.js';
import { normalize } from './transformer/normalize.js';
import { aggregate } from './transformer/aggregate.js';
import { stage } from './transformer/stage.js';
import { validate } from './validator/index.js';

export function run(db, { count = 50 } = {}) {
  seed(db, { count });
  console.log(`Pipeline run: ${count} orders seeded`);

  const normalizeCount = normalize(db);
  console.log(`✓ normalize    ${normalizeCount} order_totals written`);

  const aggregateCount = aggregate(db);
  console.log(`✓ aggregate    ${aggregateCount} daily summaries written`);

  const { cleanCount, invalidCount } = stage(db);
  console.log(`✓ stage        ${cleanCount} clean / ${invalidCount} flagged invalid`);

  const report = validate(db);
  console.log(`✓ validate     ${report.passed}/${report.passed + report.failed} checks passed`);

  return report;
}

const isMain = process.argv[1] === new URL(import.meta.url).pathname;
if (isMain) {
  const db = createDb();
  run(db);
}
