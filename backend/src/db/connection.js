import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import { config } from '../config.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(currentDir, 'schema.sql');

let database = null;

export function getDatabase() {
  if (database) {
    return database;
  }

  const databasePath = config.databasePath;
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(fs.readFileSync(schemaPath, 'utf8'));

  return database;
}

export function closeDatabase() {
  if (database) {
    database.close();
    database = null;
  }
}
