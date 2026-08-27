const Database = require('better-sqlite3');
const path = require('path');

// Create/open database file
const db = new Database(path.join(__dirname, '..', 'billing.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('✓ SQLite database connected');

module.exports = db;