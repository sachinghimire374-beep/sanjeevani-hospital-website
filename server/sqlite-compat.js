// better-sqlite3-compatible wrapper around node-sqlite3-wasm.
//
// Shared hosting (CageFS/CloudLinux) blocks compiling native addons and often
// ships a glibc too old for better-sqlite3's prebuilt binaries. node-sqlite3-wasm
// has zero native dependencies, so this wraps its API to match better-sqlite3's
// db.prepare(sql).get/all/run(...args) shape, letting db.js/server.js stay unchanged.
const fs = require('fs');
const { Database: WasmDatabase } = require('node-sqlite3-wasm');

class Statement {
  constructor(rawDb, sql) {
    this.rawDb = rawDb;
    this.sql = sql;
  }
  // node-sqlite3-wasm takes a single "values" argument (one value, or an array
  // for multiple placeholders) instead of better-sqlite3's variadic args.
  _bind(args) {
    if (args.length === 0) return [];
    if (args.length === 1) return [args[0]];
    return [args];
  }
  get(...args) { return this.rawDb.get(this.sql, ...this._bind(args)); }
  all(...args) { return this.rawDb.all(this.sql, ...this._bind(args)); }
  run(...args) { return this.rawDb.run(this.sql, ...this._bind(args)); }
}

module.exports = class Database {
  constructor(dbPath) {
    // Only one process is ever supposed to hold this database, so a lock
    // folder still present at startup means a previous process was killed
    // (e.g. Passenger recycling an idle worker) before it could clean up —
    // it's stale, not a real concurrent holder. Left in place, every future
    // start fails with "database is locked" until someone removes it by hand.
    const lockPath = dbPath + '.lock';
    if (fs.existsSync(lockPath)) fs.rmSync(lockPath, { recursive: true, force: true });
    this.raw = new WasmDatabase(dbPath);
  }
  prepare(sql) {
    return new Statement(this.raw, sql);
  }
  exec(sql) {
    return this.raw.exec(sql);
  }
  pragma() {
    // no-op: WAL journal mode isn't applicable to the WASM VFS
  }
};
