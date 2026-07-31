// better-sqlite3-compatible wrapper around node-sqlite3-wasm.
//
// Shared hosting (CageFS/CloudLinux) blocks compiling native addons and often
// ships a glibc too old for better-sqlite3's prebuilt binaries. node-sqlite3-wasm
// has zero native dependencies, so this wraps its API to match better-sqlite3's
// db.prepare(sql).get/all/run(...args) shape, letting db.js/server.js stay unchanged.
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
