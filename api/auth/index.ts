import { Api } from "../../core/utils/abstract.ts";
import { RouteError } from "../../core/utils/route-error.ts";
import { AuthQuery } from "./query.ts";
import { SessionService } from "./services/session.ts";
import { authTables } from "./tables.ts";
export class AuthApi extends Api {
  query = new AuthQuery(this.db);
  session = new SessionService(this.core);
  handlers = {
    postUser: (req, res) => {
      const { name, username, email, password } = req.body;
      const password_hash = password;
      const writeResult = this.query.insertUser({
        name,
        username,
        email,
        role: "user",
        password_hash,
      });

      if (writeResult.changes === 0) {
        throw new RouteError(400, "Erro ao criar usuário");
      }
      res.status(201).json({ title: "Usuário criado" });
    },
    postLogin: async (req, res) => {
      const { email, password } = req.body;
      const user = this.db
        .query(
          /*sql*/ `
        SELECT "id", "password_hash" FROM "users" WHERE "email" = ? `
        )
        .get(email);
      if (!user || password !== user.password_hash) {
        throw new RouteError(404, "email ou senha incorretos");
      }

      const { sid_hash } = await this.session.create({
        userId: user.id,
        ip: req.ip,
        ua: req.headers["user-agent"] ?? "",
      });
      res.setHeader("Set-Cookie", `sid=${sid_hash}; Path=/`);
      res.status(200).json("teste");
    },
  } satisfies Api["handlers"];
  tables() {
    this.db.exec(authTables);
  }
  routes(): void {
    this.router.post("/auth/user", this.handlers.postUser);
    this.router.post("/auth/login", this.handlers.postLogin);
  }
}
