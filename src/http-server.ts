import Koa, { Middleware } from 'koa';
import Router from 'koa-tree-router';
import { HttpRoute } from './http-route';
import bodyParser from 'koa-bodyparser';

type HttpRouteHandler<I, O> = (arg: I) => O | Promise<O>;
type HttpRoutePair<I, O> = { route: HttpRoute<I, O>; handler: HttpRouteHandler<I, O> };

export class HttpServer {
  protected routes: HttpRoutePair<any, any>[] = [];

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

    return new Promise((resolve) => app.listen(port, resolve as () => void));
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

// class Resolver {
//   get<T extends { prototype: any }>(type: T): T['prototype'] {
//     return new (type as any)();
//   }
// }

// type Constructor = new (...args: any[]) => any;

// type MethodOf<
//   TClassType extends Constructor,
//   TSubjectType extends Constructor,
//   TClass = InstanceType<TClassType>,
//   TSubject = InstanceType<TSubjectType>
// > = {
//   [TProperty in keyof TClass]: TClass[TProperty] extends (arg: infer U, ...extras: infer E) => any
//     ? U extends TSubject
//       ? TProperty
//       : never
//     : never;
// }[keyof TClass];

// export class HttpServerWithContainer extends HttpServer {
//   constructor(private readonly resolver: Resolver = new Resolver()) {
//     super();
//   }

//   useClass<I, O, P extends string, T extends MethodOf<>>(
//     route: { prototype: HttpRoute<I, O> },
//     handler: T,
//     method: P,
//   ): HttpServerWithContainer {
//     this.routes.push({
//       route: this.resolver.get(route),
//       handler: (arg: I): O | Promise<O> => {
//         const subject = this.resolver.get(handler as any);
//         return subject[method](arg);
//       },
//     });
//     return this;
//   }
// }
