import { Query } from "../../core/utils/abstract.ts";
export type UserRole = "admin" | "editor" | "user";

type UserData = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  password_hash: string;
  created: string;
  updated: string;
};

type UserCreate = Omit<UserData, "id" | "created" | "updated">;

type SessionData = {
  sid_hash: Buffer;
  user_id: number;
  created: number;
  expires: number;
  ip: string;
  ua: string;
  revoked: number;
};

type SessionCreate = Omit<SessionData, "created" | "revoked" | "expires"> & {
  expires_ms: number;
};

type ResetData = {
  token_hash: Buffer;
  user_id: number;
  created: number;
  expires: number;
  ip: string;
  ua: string;
};

type ResetCreate = Omit<ResetData, "created" | "expires"> & {
  expires_ms: number;
};

export class AuthQuery extends Query {
  insertUser({ name, username, email, role, password_hash }: UserCreate) {
    return this.db
      .query(
        /*sql*/ `
      INSERT OR IGNORE INTO "users"
      ("name", "username", "email", "role", "password_hash")
      VALUES
      (?, ?, ?, ?, ?)`,
      )
      .run(name, username, email, role, password_hash);
  }
  selectUser(key: "email" | "username" | "id", value: string | number) {
    return this.db
      .query(
        /*sql*/ `
        SELECT "id", "password_hash", "email" 
        FROM "users" WHERE ${key} = ? `,
      )
      .get(value) as
      | { id: number; email: string; password_hash: string }
      | undefined;
  }

  insertSession({ sid_hash, user_id, expires_ms, ip, ua }: SessionCreate) {
    return this.db
      .query(
        /*sql*/ `
      INSERT OR IGNORE INTO "sessions"
      ("sid_hash", "user_id", "expires", "ip", "ua")
      VALUES
      (?, ?, ?, ?, ?)`,
      )
      .run(sid_hash, user_id, Math.floor(expires_ms / 1000), ip, ua);
  }

  selectSession(sid_hash: Buffer) {
    return this.db
      .query(
        /*sql*/ `
      SELECT "s".*, "s".expires * 1000 as "expires_ms" 
      FROM "sessions" as "s"
      WHERE "sid_hash" = ?`,
      )
      .get(sid_hash) as (SessionData & { expires_ms: number }) | undefined;
  }

  revokeSession(sid_hash: Buffer) {
    return this.db
      .query(
        /*sql*/ `
      UPDATE "sessions" SET "revoked" = 1 WHERE "sid_hash" = ?`,
      )
      .run(sid_hash);
  }

  revokeSessions(user_id: number) {
    return this.db
      .query(
        /*sql*/ `
      UPDATE "sessions" SET "revoked" = 1 WHERE "user_id" = ?`,
      )
      .run(user_id);
  }

  updateSessionExpires(sid_hash: Buffer, expires_ms: number) {
    return this.db
      .query(
        /*sql*/ `
      UPDATE "sessions" SET "expires" = ? 
      WHERE "sid_hash" = ?`,
      )
      .run(Math.floor(expires_ms / 1000), sid_hash);
  }

  updateUser(
    user_id: number,
    key: "password_hash" | "email" | "name",
    value: string,
  ) {
    return this.db
      .query(
        /*sql*/ `UPDATE "users" SET ${key} = ? 
      WHERE "id" = ?`,
      )
      .run(value, user_id);
  }

  selectUserRole(userId: number) {
    return this.db
      .query(
        /*sql*/ `
        SELECT "role" FROM "users" WHERE "id" = ?
      `,
      )
      .get(userId) as { role: UserRole } | undefined;
  }

  insertReset({ token_hash, user_id, expires_ms, ip, ua }: ResetCreate) {
    return this.db
      .query(
        /*sql*/ `
      INSERT OR IGNORE INTO "resets"
      ("token_hash", "user_id", "expires", "ip", "ua")
      VALUES
      (?, ?, ?, ?, ?)`,
      )
      .run(token_hash, user_id, Math.floor(expires_ms / 1000), ip, ua);
  }

  selectReset(token_hash: Buffer) {
    return this.db
      .query(
        /*sql*/ `
      SELECT "r".*, "r".expires * 1000 as "expires_ms" 
      FROM "resets" as "r"
      WHERE "token_hash" = ?`,
      )
      .get(token_hash) as (ResetData & { expires_ms: number }) | undefined;
  }

  deleteReset(user_id: number) {
    return this.db
      .query(
        /*sql*/ `
      DELETE FROM "resets" WHERE "user_id" = ?`,
      )
      .run(user_id);
  }
}
