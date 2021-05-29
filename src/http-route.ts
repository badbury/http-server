import { RouterContext as Context } from 'koa-tree-router';

export interface HttpRoute<I, O> {
  present?(ctx: Context, response: O): void;
  error?(ctx: Context, error: Error): void;
}

export abstract class HttpRoute<I, O> {
  abstract method: string;
  abstract route: string;
  abstract prepare(ctx: Context): I | Promise<I>;
}

export abstract class HttpRouteFor<
  T extends { [X in P]: (...args: any[]) => unknown } = any,
  P extends keyof T = any
> extends HttpRoute<Parameters<T[P]>[0], ReturnType<T[P]>> {}
