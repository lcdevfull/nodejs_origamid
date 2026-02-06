import { CoreProvider } from "../../../core/utils/abstract.ts";
import { RouteError } from "../../../core/utils/route-error.ts";
import { AuthQuery } from "../query.ts";
import { randomBytesAsync, sha256 } from "../utils/utils.ts";

const ttlSec = 60 * 60 * 24 * 15;
const ttlSec5days = 60 * 60 * 24 * 5;
export const COOKIE_SID_KEY = "__Secure-sid";

function sidCookie(sid: string, expires: number) {
  return `${COOKIE_SID_KEY}=${sid}; Path=/; Max-age=${expires}; HttpOnly; Secure; Same-Site=Lax`;
}

export class SessionService extends CoreProvider {
  query = new AuthQuery(this.db);

  async create({ userId, ip, ua }: { userId: number; ip: string; ua: string }) {
    const sid = (await randomBytesAsync(32)).toString("base64url");
    const sid_hash = sha256(sid);
    const expires_ms = Date.now() + ttlSec * 1000;
    this.query.insertSession({ sid_hash, user_id: userId, expires_ms, ip, ua });
    const cookie = sidCookie(sid, ttlSec);
    return { cookie };
  }

  validate(sid: string) {
    const now = Date.now();
    const sid_hash = sha256(sid);
    const session = this.query.selectSession(sid_hash);

    if (!session || session.revoked === 1) {
      return {
        valid: false,
        cookie: sidCookie("", 0),
      };
    }
    let expires_ms = session.expires_ms;
    if (now >= expires_ms) {
      this.query.revokeSession(sid_hash);
      return {
        valid: false,
        cookie: sidCookie("", 0),
      };
    }

    if (now >= expires_ms - 1000 * ttlSec5days) {
      const expires_msUpdate = now + 1000 * ttlSec;
      this.query.updateSessionExpires(sid_hash, expires_msUpdate);
      expires_ms = expires_msUpdate;
    }

    const user = this.query.selectUserRole(session.user_id);
    if (!user) {
      this.query.revokeSession(sid_hash);
      return {
        valid: false,
        cookie: sidCookie("", 0),
      };
    }

    return {
      valid: true,
      cookie: sidCookie(sid, Math.floor((expires_ms - now) / 1000)),
      session: {
        user_id: session.user_id,
        role: user.role,
        expires_ms,
      },
    };
  }

  invalidate(sid: string | undefined) {
    const cookie = sidCookie("", 0);
    try {
      if (sid) {
        const sid_hash = sha256(sid);
        this.query.revokeSession(sid_hash);
      }
    } catch (error) {
      console.error(error);
    }
    return { cookie };
  }

  invalidateAll(userId: number) {
    const cookie = sidCookie("", 0);
    try {
      this.query.revokeSessions(userId);
    } catch (error) {
      console.error(error);
    }
    return { cookie };
  }

  async resetToke({
    userId,
    ip,
    ua,
  }: {
    userId: number;
    ip: string;
    ua: string;
  }) {
    const token = (await randomBytesAsync(32)).toString("base64url");
    const token_hash = sha256(token);
    const expires_ms = Date.now() + 1000 * 60 * 30;
    this.query.insertReset({ token_hash, user_id: userId, expires_ms, ip, ua });
    return { token };
  }
  validateToken(token: string) {
    const now = Date.now();
    const token_hash = sha256(token);
    const reset = this.query.selectReset(token_hash);
    if (!reset) {
      return null;
    }

    if (now > reset.expires_ms) {
      return null;
    }

    this.query.revokeSessions(reset.user_id);
    this.query.deleteReset(reset.user_id);

    return { user_id: reset.user_id };
  }
}
