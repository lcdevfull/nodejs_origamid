import { Query } from "../../core/utils/abstract.ts";
type UserRole = "admin" | "editor" | "user";

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

export class AuthQuery extends Query {
  insertUser({ name, username, email, role, password_hash }: UserCreate) {
    return this.db
      .query(
        /*sql*/ `
      INSERT OR IGNORE INTO "users"
      ("name", "username", "email", "role", "password_hash")
      VALUES
      (?, ?, ?, ?, ?)`
      )
      .run(name, username, email, role, password_hash);
  }

  insertSession({ sid_hash, user_id, expires_ms, ip, ua }) {
    return this.db
      .query(
        /*sql*/ `
      INSERT OR IGNORE INTO "sessions"
      ("sid_hash", "user_id", "expires", "ip", "ua")
      VALUES
      (?, ?, ?, ?, ?)`
      )
      .run(sid_hash, user_id, Math.floor(expires_ms / 1000), ip, ua);
  }
}
