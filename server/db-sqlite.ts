import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite database file path
const dbPath = path.join(dataDir, 'itsukime.db');

// Create the database connection
const sqlite = new Database(dbPath);

// Enable foreign keys support
sqlite.exec('PRAGMA foreign_keys = ON');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Optional: Close the database connection when the process exits
process.on('exit', () => {
  sqlite.close();
});