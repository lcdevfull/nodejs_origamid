import type { Middleware } from "../router.ts";
import { RouteError } from "../utils/route-error.ts";

type Request = {
  hits: number;
  reset: number;
};

export const rateLimit = (time: number, max: number): Middleware => {
  const requests = new Map<string, Request>();

  setInterval(
    () => {
      const now = Date.now();
      for (const [key, item] of requests) {
        if (now >= item.reset) requests.delete(key);
      }
    },
    30 * 60 * 1000,
  ).unref();

  return (req, res) => {
    const now = Date.now(),
      key = req.ip;
    let request = requests.get(key);
    if (request === undefined || now >= request.reset) {
      request = {
        hits: 0,
        reset: now + time,
      };
      requests.set(key, request);
    }
    request.hits += 1;
    const sLeft = Math.ceil((request.reset - now) / 1000);
    const rLeft = Math.max(0, max - request.hits);
    const sTime = Math.ceil(time / 1000);
    res.setHeader("RateLimit", `"default";r=${rLeft};t=${sLeft}`);
    res.setHeader("RateLimit-Policy", `"default";q=${max};w=${sTime}`);

    if (request.hits > max) {
      res.setHeader("Retry-After", `${sLeft}`);
      throw new RouteError(429, "rate-limit");
    }

    console.log(requests);
  };
};
