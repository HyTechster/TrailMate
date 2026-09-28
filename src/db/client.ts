import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { migrate } from './schema';

let db: SQLiteDatabase | null = null;

/**
 * The single app database. Shared by screens and the background location
 * task, which can run with no UI mounted.
 */
export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('trailmate.db');
    migrate(db);
  }
  return db;
}
