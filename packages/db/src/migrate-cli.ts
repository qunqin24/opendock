import { runMigrations } from './migrate.ts';

await runMigrations();
console.log('Migrations applied.');
process.exit(0);
