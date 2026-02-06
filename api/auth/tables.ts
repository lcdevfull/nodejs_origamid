export const authTables = /*sql*/ `
CREATE TABLE IF NOT EXISTS "users" (
   "id" INTEGER PRIMARY KEY,
   "name" TEXT NOT NULL,
   "username" TEXT NOT NULL COLLATE NOCASE UNIQUE,
   "email" TEXT NOT NULL COLLATE NOCASE UNIQUE,
   "role" TEXT NOT NULL CHECK ("role" IN ('user', 'editor', 'admin')),
   "password_hash" TEXT NOT NULL,
   "created" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   "updated" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)STRICT;

CREATE TABLE IF NOT EXISTS "sessions" (
   "sid_hash" BLOB PRIMARY KEY,
   "user_id" INTEGER NOT NULL,
   "created" INTEGER NOT NULL DEFAULT (STRFTIME('%s', 'NOW')),
   "expires" INTEGER NOT NULL,
   "ip" TEXT,
   "ua" TEXT,
   "revoked" INTEGER NOT NULL DEFAULT 0 CHECK("revoked" IN (0, 1)),
   FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
   
)WITHOUT ROWID, STRICT;

CREATE INDEX IF NOT EXISTS "idx_session_user" ON "sessions"("user_id");

CREATE TABLE IF NOT EXISTS "resets" (
   "token_hash" BLOB PRIMARY KEY,
   "user_id" INTEGER NOT NULL,
   "created" INTEGER NOT NULL DEFAULT (STRFTIME('%s', 'NOW')),
   "expires" INTEGER NOT NULL,
   "ip" TEXT,
   "ua" TEXT,
   FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
   
)WITHOUT ROWID, STRICT;

CREATE INDEX IF NOT EXISTS "idx_reset_user" ON "resets"("user_id");
`;
