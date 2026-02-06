import type { Middleware } from "../../../core/router.ts";
import { CoreProvider } from "../../../core/utils/abstract.ts";
import { RouteError } from "../../../core/utils/route-error.ts";
import type { UserRole } from "../query.ts";
import { COOKIE_SID_KEY, SessionService } from "../services/session.ts";

function roleCheck(requiredRole: UserRole, userRole: UserRole): boolean {
  switch (userRole) {
    case "admin":
      return true;
    case "editor":
      return requiredRole === "editor" || requiredRole === "user";
    case "user":
      return requiredRole === "user";
    default:
      return false;
  }
}

export class AuthMiddleware extends CoreProvider {
  session = new SessionService(this.core);

  guard =
    (role: UserRole): Middleware =>
    async (req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Very", "Cookie");
      const sid = req.cookies[COOKIE_SID_KEY];
      if (!sid) {
        throw new RouteError(401, "Não Autorizado");
      }

      const { valid, cookie, session } = this.session.validate(sid);
      res.setCookie(cookie);
      if (!valid || !session) {
        throw new RouteError(401, "Não Autorizado");
      }

      if (!roleCheck(role, session.role)) {
        throw new RouteError(403, "Sem permissão");
      }
      req.session = session;
    };
  optional: Middleware = async (req, res) => {
    const sid = req.cookies[COOKIE_SID_KEY];
    if (!sid) {
      return;
    }

    const { valid, cookie, session } = this.session.validate(sid);
    res.setCookie(cookie);
    if (!valid || !session) {
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Very", "Cookie");
    req.session = session;
  };
}
