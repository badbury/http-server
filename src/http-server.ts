import Koa from 'koa';
import Router, { Middleware } from 'koa-tree-router';
import { HttpRoute } from './http-route';
import bodyParser from 'koa-bodyparser';
import { Server } from 'http';
import { ListenOptions } from 'net';

type HttpRouteHandler<I, O> = (arg: I) => O | Promise<O>;
type HttpRoutePair<I, O> = { route: HttpRoute<I, O>; handler: HttpRouteHandler<I, O> };

export class HttpServerConfig implements ListenOptions {
  port = 80;
  env?: string;
  keys?: string[];
  proxy?: boolean;
  subdomainOffset?: number;
  proxyIpHeader?: string;
  maxIpsCount?: number;
}

class UnknownError extends Error {
  constructor(public error: unknown) {
    super('Invalid type thrown');
  }
}

export class HttpServer {
  protected routes: HttpRoutePair<any, any>[] = [];
  protected server: Server | undefined;

  use<I, O>(route: HttpRoute<I, O>, handler: HttpRouteHandler<I, O>): HttpServer {
    this.routes.push({ route, handler });
    return this;
  }

  async connect(config: HttpServerConfig): Promise<void> {
    const app = new Koa(config);
    const router = new Router();
    for (const { route, handler } of this.routes) {
      router.on(route.method.toUpperCase(), route.route, this.buildHandler(route, handler));
    }

    app.use(bodyParser());
    app.use(router.routes());

    return new Promise((resolve) => {
      this.server = app.listen(config, () => {
        resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server?.close((error) => (error ? reject(error) : resolve()));
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
        if (route.error) {
          return route.error(ctx, this.parseError(error));
        }
        ctx.status = 500;
        ctx.body = 'Something went wrong';
      }
    };
  }

  private parseError(error: unknown): Error {
    if (typeof error === 'string') {
      return new Error(error);
    }
    if (!(error instanceof Error)) {
      return new UnknownError(error);
    }
    return error;
  }
}
