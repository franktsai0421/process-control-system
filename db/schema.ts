import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const stateBackups = sqliteTable('state_backups', {
  id: text('id').primaryKey(), revision: integer('revision').notNull(),
  values: text('values').notNull(), reason: text('reason').notNull(),
  actor: text('actor').notNull(), createdAt: text('created_at').notNull(),
});

export const sharedState = sqliteTable('shared_state', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull(),
  values: text('values').notNull(),
  updatedAt: text('updated_at').notNull(),
});
