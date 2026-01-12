import { DatabaseSync, type StatementSync } from "node:sqlite";

export class Database extends DatabaseSync {
  queries: Record<string, StatementSync>;
  constructor(path: string) {
    super(path);
    this.queries = {};
    this.exec(`
  PRAGMA foreign_keys = 1;
  PRAGMA journal_mode = DELETE;
  PRAGMA synchronous = NORMAL;

  PRAGMA cache_size = 2000;
  PRAGMA busy_timeout = 5000;
  PRAGMA temp_store = MEMORY;
`);
  }

  query(sql: string) {
    if (!this.queries[sql]) {
      this.queries[sql] = this.prepare(sql);
    }
    return this.queries[sql];
  }
}
