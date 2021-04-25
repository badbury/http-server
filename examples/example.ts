// Domain
class GetUsers {
  handle(request: { limit: number }): { name: string }[] {
    return [{ name: 'Steve' }].slice(0, request.limit);
  }
}

type GetUsersRequest = Parameters<GetUsers['handle']>[0];
type GetUsersResponse = ReturnType<GetUsers['handle']>;

// Http Adapter
import { Context } from 'koa';

type Handler<T> = [new (...args: any[]) => T, keyof T];

class GetUsersHttpRequest implements GetUsersRequest {
  static method = 'GET';
  static route = '/users';
  static handler: Handler<GetUsers> = [GetUsers, 'handle'];

  limit: number;

  constructor(private ctx: Context) {
    this.limit = Number(ctx.request.query.limit);
  }

  present(users: GetUsersResponse) {
    this.ctx.body = JSON.stringify({
      count: users.length,
      data: users,
    });
  }
}

const g: HttpRequest<GetUsers, 'handle'> = GetUsersHttpRequest;

console.log(new g.handler[0]());

import Koa from 'koa';
import Router from 'koa-tree-router';

type HttpMethod =
  | 'get'
  | 'put'
  | 'post'
  | 'delete'
  | 'head'
  | 'patch'
  | 'options'
  | 'trace'
  | 'connect'
  | 'GET'
  | 'PUT'
  | 'POST'
  | 'DELETE'
  | 'HEAD'
  | 'PATCH'
  | 'OPTIONS'
  | 'TRACE'
  | 'CONNECT';

type HttpRequest<T extends { [X in P]: (...args: any[]) => unknown }, P extends keyof T> = {
  method: string;
  route: string;
  handler: [new (...args: unknown[]) => T, P];
  new (ctx: Context): Parameters<T[P]>[0] & {
    present?: (response: ReturnType<T[P]>) => void;
  };
};

class HttpServer {
  constructor(private routes: HttpRequest<any, any>[]) {}
  serve() {
    const app = new Koa();
    const router = new Router();
    for (const route of this.routes) {
      this.registerRoute(router, route);
    }

    app.use(router.routes());

    app.listen(8080);
  }

  registerRoute<T extends { [X in P]: (...args: any[]) => unknown }, P extends keyof T>(
    router: Router,
    route: HttpRequest<T, P>,
  ) {
    router.on(route.method, route.route, (ctx) => {
      const request = new route(ctx);
      const handler = new route.handler[0]();
      const response = handler[route.handler[1]](request);
      if (request.present) {
        return request.present(response);
      }
      ctx.body = JSON.stringify(response);
    });
  }
}

const server = new HttpServer([g]);

server.serve();
