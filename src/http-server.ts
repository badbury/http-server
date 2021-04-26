import Koa from 'koa';
import Router from 'koa-tree-router';
import { HttpRoute } from './http-route';

class Resolver {
  get<T extends { prototype: any }>(type: T): T['prototype'] {
    return new (type as any)();
  }
}

export class HttpServer {
  constructor(private routes: HttpRoute<any, any>[], private resolver: Resolver = new Resolver()) {}

  async serve(port: number): Promise<undefined> {
    const app = new Koa();
    const router = new Router();
    for (const route of this.routes) {
      this.registerRoute(router, route);
    }

    app.use(router.routes());

    return new Promise((resolve) => app.listen(port, resolve as () => void));
  }

  registerRoute<T extends { [X in P]: (...args: any[]) => unknown }, P extends keyof T>(
    router: Router,
    route: HttpRoute<T, P>,
  ): void {
    router.on(route.method.toUpperCase(), route.route, (ctx) => {
      const request = route.prepare(ctx);
      const handler = this.resolver.get(route.handler.type);
      try {
        const response = handler[route.handler.method](request);
        if (route.present) {
          return route.present(ctx, response);
        }
      } catch (error) {
        if (typeof error === 'string') {
          error = new Error(error);
        }
        route.error(ctx, error);
      }
    });
  }
}
