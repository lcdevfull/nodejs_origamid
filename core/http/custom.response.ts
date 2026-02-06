import type { ServerResponse } from "http";

export interface CustomResponse extends ServerResponse {
  status(code: number): CustomResponse;
  json(data: any): void;
  setCookie(cookie: string): void;
}

export function customResponse(response: ServerResponse) {
  const res = response as CustomResponse;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.json = (data) => {
    try {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    } catch (error) {
      res.status(500).end("Erro");
    }
  };
  res.setCookie = (cookie) => {
    const current = res.getHeader("Set-Cookie");
    if (current === undefined) {
      res.setHeader("Set-Cookie", [cookie]);
      return;
    }

    if (Array.isArray(current)) {
      current.push(cookie);
      res.setHeader("Set-Cookie", current);
      return;
    }
    res.setHeader("Set-Cookie", [String(current), cookie]);
  };

  return res;
}
