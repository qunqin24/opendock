/**
 * Database schema. Phase 0 starts with what the admin needs: accounts and
 * sessions, manual curation (overrides), opt-in install telemetry and an
 * audit log. Plugin data itself still comes from the JSON snapshot; its
 * tables arrive with the worker (see docs/rewrite/DESIGN.md).
 */
import { sql } from 'drizzle-orm';
import { bigint, boolean, date, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  /** scrypt: `scrypt$N$r$p$salt$hash`, base64url parts. */
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('admin'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 of the cookie token; the token itself is never stored. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

/** Manual curation. A null field means "no override, use the data". */
export const pluginOverrides = pgTable('plugin_overrides', {
  packageName: text('package_name').primaryKey(),
  category: text('category'),
  featured: boolean('featured'),
  blocked: boolean('blocked'),
  note: text('note'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
});

export const installAction = pgEnum('install_action', ['install', 'update', 'uninstall']);

/** Anonymous, opt-in events from the OpenDock plugin. No IP, no user id. */
export const installEvents = pgTable(
  'install_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    day: date('day').notNull().default(sql`current_date`),
    packageName: text('package_name').notNull(),
    action: installAction('action').notNull(),
    opencodeVersion: text('opencode_version'),
    clientVersion: text('client_version'),
  },
  (t) => [index('install_events_day_idx').on(t.day), index('install_events_package_idx').on(t.packageName)],
);

export const auditLog = pgTable('audit_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  target: text('target'),
  detail: jsonb('detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
