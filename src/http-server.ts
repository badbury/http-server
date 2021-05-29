import Koa from 'koa';
import Router, { Middleware } from 'koa-tree-router';
import { HttpRoute } from './http-route';
import bodyParser from 'koa-bodyparser';
import { Server } from 'http';

type HttpRouteHandler<I, O> = (arg: I) => O | Promise<O>;
type HttpRoutePair<I, O> = { route: HttpRoute<I, O>; handler: HttpRouteHandler<I, O> };

export class HttpServer {
  protected routes: HttpRoutePair<any, any>[] = [];
  protected server: Server | undefined;

  use<I, O>(route: HttpRoute<I, O>, handler: HttpRouteHandler<I, O>): HttpServer {
    this.routes.push({ route, handler });
    return this;
  }

  async serve(port: number): Promise<undefined> {
    const app = new Koa();
    const router = new Router();
    for (const { route, handler } of this.routes) {
      router.on(route.method.toUpperCase(), route.route, this.buildHandler(route, handler));
    }

    app.use(bodyParser());
    app.use(router.routes());

    return new Promise((resolve) => {
      this.server = app.listen(port, resolve as () => void);
    });
  }

  async shutdown(): Promise<undefined> {
    return new Promise((resolve, reject) => {
      this.server?.close((error) => (error ? reject(error) : resolve(undefined)));
    });
  }

  buildHandler<I, O>(route: HttpRoute<I, O>, handler: HttpRouteHandler<I, O>): Middleware {
    return async (ctx) => {
      const request = await route.prepare(ctx);
      try {
        const response = await handler(request);
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
