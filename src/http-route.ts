import { Context } from 'koa';

export class Handler<
  T extends { [X in P]: (...args: any[]) => unknown } = any,
  P extends keyof T = any
> {
  constructor(public type: new (...args: any[]) => T, public method: P) {}
}

export function handler<
  T extends { [X in P]: (...args: any[]) => unknown } = any,
  P extends keyof T = any
>(type: new (...args: any[]) => T, method: P): Handler<T, P> {
  return new Handler(type, method);
}

export interface HttpRoute<
  T extends { [X in P]: (...args: any[]) => unknown } = any,
  P extends keyof T = any
> {
  present?(ctx: Context, response: ReturnType<T[P]>): void;
  error?(ctx: Context, error: Error): void;
}

export abstract class HttpRoute<
  T extends { [X in P]: (...args: any[]) => unknown } = any,
  P extends keyof T = any
> {
  abstract method: string;
  abstract route: string;
  abstract handler: Handler<T, P>;
  abstract prepare(ctx: Context): Parameters<T[P]>[0];
}
