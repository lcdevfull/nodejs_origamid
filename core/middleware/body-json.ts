import type { Middleware } from "../router.ts";
import { RouteError } from "../utils/route-error.ts";

const MAX_SIZE = 5_000_000;

export const bodyJson: Middleware = async (req, res) => {
  if (
    req.headers["content-type"] !== "application/json" &&
    req.headers["content-type"] !== "application/json; charset=utf-8"
  ) {
    return;
  }

  const contentLenght = Number(req.headers["content-length"]);
  if (!Number.isInteger(contentLenght)) {
    throw new RouteError(413, "Content-length inválido");
  }
  if (contentLenght > MAX_SIZE) {
    throw new RouteError(413, "Corpo grande");
  }

  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of req) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buf.length;
      if (size > MAX_SIZE) {
        throw new RouteError(413, "Corpo grande");
      }
      chunks.push(buf);
    }
  } catch (error) {
    throw new RouteError(400, "Requisição abortada");
  }

  try {
    const body = Buffer.concat(chunks).toString("utf-8");
    if (body === "") {
      req.body = {};
      return;
    }
    req.body = JSON.parse(body);
  } catch (error) {
    throw new RouteError(400, "Json inválido");
  }
};
