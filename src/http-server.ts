import Koa, { Middleware } from 'koa';
import Router from 'koa-tree-router';
import { HttpRoute } from './http-route';
import bodyParser from 'koa-bodyparser';

class Resolver {
  get<T extends { prototype: any }>(type: T): T['prototype'] {
    return new (type as any)();
  }
}

export class HttpServer {
  private routes: HttpRoute<any, any>[] = [];

  constructor(private resolver: Resolver = new Resolver()) {}

  use(route: HttpRoute<any, any>): HttpServer {
    this.routes.push(route);
    return this;
  }

  async serve(port: number): Promise<undefined> {
    const app = new Koa();
    const router = new Router();
    for (const route of this.routes) {
      router.on(route.method.toUpperCase(), route.route, this.buildHandler(route));
    }

    app.use(bodyParser());
    app.use(router.routes());

    return new Promise((resolve) => app.listen(port, resolve as () => void));
  }

  buildHandler<T extends { [X in P]: (...args: any[]) => unknown }, P extends keyof T>(
    route: HttpRoute<T, P>,
  ): Middleware {
    return (ctx) => {
      const request = route.prepare(ctx);
      const handler = this.resolver.get(route.handler.type);
      try {
        const response = handler[route.handler.method](request);
        if (route.present) {
          return route.present(ctx, response);
        }
        ctx.body = response;
      } catch (error) {
        if (typeof error === 'string') {
          error = new Error(error);
        }
        if (route.error) {
          return route.error(ctx, error);
        }
        ctx.status = 500;
        ctx.body = 'Something went wrong';
      }
    };
  }
}
