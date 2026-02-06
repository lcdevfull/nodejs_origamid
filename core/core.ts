import {
  createServer,
  type ServerResponse,
  type IncomingMessage,
  type Server,
} from "http";
import { Router } from "./router.ts";
import { customRequest } from "./http/custom-request.ts";
import { customResponse } from "./http/custom.response.ts";
import { bodyJson } from "./middleware/body-json.ts";
import { RouteError } from "./utils/route-error.ts";
import { Database } from "./database.ts";

export class Core {
  router: Router;
  server: Server;
  db: Database;
  constructor() {
    this.router = new Router();
    this.router.use([bodyJson]);
    this.db = new Database("./lms.sqlite");
    this.server = createServer(this.handler);
  }

  handler = async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const req = await customRequest(request);
      const res = customResponse(response);

      // Executando Middlewares globais
      for (const middleware of this.router.middlewares) {
        await middleware(req, res);
      }

      const matched = this.router.find(req.method, req.pathname);
      if (!matched) {
        throw new RouteError(404, "Não encontrado");
      }
      const { route, params } = matched;

      req.params = params;
      // Executando middlewares locais
      for (const middleware of route.middlewares) {
        await middleware(req, res);
      }
      await route.handler(req, res);
    } catch (error) {
      if (error instanceof RouteError) {
        console.error(
          `${error.status} ${error.message} | method: ${request.method} url: ${request.url}`,
        );
        response.statusCode = error.status;
        response.setHeader("content-type", "application/problem+json");
        response.end(
          JSON.stringify({ status: response.statusCode, title: error.message }),
        );
      } else {
        console.error(error);
        response.statusCode = 500;
        response.setHeader("content-type", "application/problem+json");
        response.end(
          JSON.stringify({ status: response.statusCode, title: "error" }),
        );
      }
    }
  };

  init() {
    this.server.listen(3000, () => {
      console.log(`Server: http://localhost:3000`);
    });

    this.server.on("clientError", (error, socket) => {
      console.error(error);
      socket.destroy();
    });
  }
}
