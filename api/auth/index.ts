import { Api } from "../../core/utils/abstract.ts";
import { RouteError } from "../../core/utils/route-error.ts";
import { AuthQuery } from "./query.ts";
import { COOKIE_SID_KEY, SessionService } from "./services/session.ts";
import { authTables } from "./tables.ts";
import { AuthMiddleware } from "./middleware/auth.ts";
import { Password } from "./utils/password.ts";
import { v } from "../../core/utils/validate.ts";
export class AuthApi extends Api {
  query = new AuthQuery(this.db);
  session = new SessionService(this.core);
  auth = new AuthMiddleware(this.core);
  pass = new Password("segredo");
  handlers = {
    postUser: async (req, res) => {
      const { name, username, email, password } = {
        name: v.string(req.body.name),
        username: v.string(req.body.username),
        email: v.email(req.body.email),
        password: v.password(req.body.password),
      };
      const emailExists = this.query.selectUser("email", email);
      if (emailExists) {
        throw new RouteError(409, "email já cadastrado");
      }

      const userNameExists = this.query.selectUser("username", username);
      if (userNameExists) {
        throw new RouteError(409, "username já cadastrado");
      }

      const password_hash = await this.pass.hash(password);
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
      const { email, password } = {
        email: v.email(req.body.email),
        password: v.password(req.body.password),
      };
      const user = this.query.selectUser("email", email);
      if (!user) {
        throw new RouteError(404, "email ou senha incorretos");
      }

      const validPassword = await this.pass.verify(
        password,
        user.password_hash,
      );

      if (!validPassword) {
        throw new RouteError(404, "email ou senha incorretos");
      }

      const { cookie } = await this.session.create({
        userId: Number(user.id),
        ip: req.ip,
        ua: req.headers["user-agent"] ?? "",
      });
      res.setCookie(cookie);
      res.status(200).json({ title: "Autenticado" });
    },
    getSession: (req, res) => {
      if (!req.session) {
        throw new RouteError(401, "Não autorizado");
      }
      res.status(200).json({ title: "Valido" });
    },
    deleteSession: (req, res) => {
      const sid = req.cookies[COOKIE_SID_KEY];
      if (!sid) {
        throw new RouteError(401, "Não autorizado");
      }

      const { cookie } = this.session.invalidate(sid);
      res.setCookie(cookie);
      res.status(204).json({ title: "logout" });
    },
    passwordUpdate: async (req, res) => {
      const { oldPassword, newPassword } = {
        oldPassword: v.password(req.body.oldPassword),
        newPassword: v.password(req.body.newPassword),
      };
      if (!req.session) {
        throw new RouteError(401, "Não autorizado");
      }

      const user = this.query.selectUser("id", req.session.user_id);
      if (!user) {
        throw new RouteError(401, "Usuário não encontrado");
      }
      const { id } = user;
      const verifyPass = await this.pass.verify(
        oldPassword,
        user.password_hash,
      );

      if (!verifyPass) {
        throw new RouteError(404, "Senha atual incorreta");
      }

      const verifyNewPass = await this.pass.verify(
        newPassword,
        user.password_hash,
      );
      if (verifyNewPass) {
        const message = "Nova senha não pode ser igual a senha antiga";
        throw new RouteError(404, message);
      }
      const password_hash = await this.pass.hash(newPassword);
      const updatePass = this.query.updateUser(
        id,
        "password_hash",
        password_hash,
      );
      if (updatePass.changes === 0) {
        throw new RouteError(400, "Falha ao atualizar senha");
      }

      this.session.invalidateAll(id);
      const { cookie } = await this.session.create({
        userId: id,
        ip: req.ip,
        ua: req.headers["user-agent"] || "",
      });
      res.setCookie(cookie);
      res.status(200).json({ message: "Senha atualizada" });
    },
    passwordForgot: async (req, res) => {
      const { email } = { email: v.email(req.body.email) };
      const user = this.query.selectUser("email", email);
      if (!user) {
        return res.status(200).json({ message: "Verifique seu email" });
      }

      const { token } = await this.session.resetToke({
        userId: user.id,
        ip: req.ip,
        ua: req.headers["user-agent"] || "",
      });
      const resetLink = `${req.baseurl}/password/reset/?token=${token}`;
      const mailContent = {
        to: user.email,
        subject: "Password Reset",
        body: `Utilize o link abaixo para resetar a sua senha: \r\n ${resetLink}`,
      };

      console.log(mailContent);
      res.status(200).json({ message: "Verifique seu email" });
    },
    passwordReset: async (req, res) => {
      const { new_password, token } = {
        new_password: v.password(req.body.new_password),
        token: v.string(req.body.token),
      };
      const reset = this.session.validateToken(token);
      if (!reset) {
        throw new RouteError(400, "Token inválido");
      }

      const new_password_hash = await this.pass.hash(new_password);
      const updateResult = this.query.updateUser(
        reset.user_id,
        "password_hash",
        new_password_hash,
      );
      if (updateResult.changes === 0) {
        throw new RouteError(400, "Falha ao atualizar senha");
      }

      res.status(200).json({ message: "Senha atualizada" });
    },
  } satisfies Api["handlers"];
  tables() {
    this.db.exec(authTables);
  }
  routes(): void {
    this.router.post("/auth/user", this.handlers.postUser);
    this.router.post("/auth/login", this.handlers.postLogin);
    this.router.delete("/auth/logout", this.handlers.deleteSession);
    this.router.post("/auth/password/forgot", this.handlers.passwordForgot);
    this.router.post("/auth/password/reset", this.handlers.passwordReset);
    this.router.put("/auth/password/update", this.handlers.passwordUpdate, [
      this.auth.guard("user"),
    ]);
    this.router.get("/auth/session", this.handlers.getSession, [
      this.auth.guard("user"),
    ]);
  }
}
