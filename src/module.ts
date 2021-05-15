import { bind, Definition, on, RegisterDefinitions, ServiceLocator, Shutdown } from '../../ioc/src';
import { HttpRoute } from './http-route';
import { HttpServer } from './http-server';

export class StartHttpServer {
  constructor(public readonly port: number) {}
}

export abstract class HttpRouteDefinition<I, O> implements Definition<HttpRouteDefinition<I, O>> {
  definition = HttpRouteDefinition;
  constructor(public readonly route: { prototype: HttpRoute<I, O> }) {}
  abstract register(resolver: ServiceLocator, server: HttpServer): void;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type AbstractClass<T = any> = Function & { prototype: T };
type Constructor<T = any, P extends any[] = any[]> = new (...args: P) => T;

type AllInstanceType<T extends AbstractClass[]> = {
  [K in keyof T]: T[K] extends { prototype: infer V } ? V : never;
};

type MethodOf<
  TClassType extends Constructor,
  TSubject,
  TExtrasType extends AbstractClass[],
  TReturn = any,
  TClass = InstanceType<TClassType>,
  TExtras = AllInstanceType<TExtrasType>
> = {
  [TProperty in keyof TClass]: TClass[TProperty] extends (
    arg: infer U,
    ...extras: infer E
  ) => TReturn
    ? U extends TSubject
      ? E extends TExtras
        ? TProperty
        : never
      : never
    : never;
}[keyof TClass];

type FunctionOf<
  TSubject,
  TExtrasType extends AbstractClass[],
  TReturn = void,
  TExtras extends any[] = AllInstanceType<TExtrasType>
> = (subject: TSubject, ...args: TExtras) => TReturn;

export class HttpRouteDefinitionBuilder<I, O, A extends AbstractClass[] = []> {
  constructor(public readonly route: { prototype: HttpRoute<I, O> }, public args: A = [] as any) {}

  use<P extends AbstractClass[]>(...args: P): HttpRouteDefinitionBuilder<I, O, P> {
    return new HttpRouteDefinitionBuilder(this.route, args);
  }

  do(target: FunctionOf<I, A, O>): HttpRouteDefinition<I, O>;
  do<C extends Constructor, M extends MethodOf<C, I, A, O>>(
    target: C,
    method: M,
  ): HttpRouteDefinition<I, O>;
  do<C extends Constructor, M extends MethodOf<C, I, A, O>>(
    target: C | FunctionOf<I, A, O>,
    method?: M,
  ): HttpRouteDefinition<I, O> {
    return method
      ? new ClassHttpRouteDefinition(this.route, this.args, target as C, method)
      : new FunctionHttpRouteDefinition(this.route, this.args, target as FunctionOf<I, A, O>);
  }
}

export class ClassHttpRouteDefinition<
  I,
  O,
  A extends AbstractClass[],
  V extends Constructor,
  M extends MethodOf<V, I, A, O>
> extends HttpRouteDefinition<I, O> {
  constructor(
    public readonly route: { prototype: HttpRoute<I, O> },
    public args: A,
    private listenerClass: V,
    private listenerMethod: M,
  ) {
    super(route);
  }

  register(resolver: ServiceLocator, server: HttpServer): void {
    const args = this.args.map((key) => resolver.get(key)) as AllInstanceType<A>;
    const route = resolver.get(this.route);
    const handler = resolver.get(this.listenerClass);
    server.use(route, (req: I) => handler[this.listenerMethod](req, ...args));
  }
}

export class FunctionHttpRouteDefinition<
  I,
  O,
  A extends AbstractClass[]
> extends HttpRouteDefinition<I, O> {
  constructor(
    public readonly route: { prototype: HttpRoute<I, O> },
    public args: A,
    private handler: FunctionOf<I, A, O>,
  ) {
    super(route);
  }

  register(resolver: ServiceLocator, server: HttpServer): void {
    const args = this.args.map((key) => resolver.get(key)) as AllInstanceType<A>;
    const route = resolver.get(this.route);
    server.use(route, (req: I) => this.handler(req, ...args));
  }
}

export class HttpModule {
  register(): Definition[] {
    return [
      bind(HttpServer),
      on(RegisterDefinitions)
        .use(HttpServer)
        .do((event, server) => {
          for (const definition of event.definitions) {
            if (definition instanceof HttpRouteDefinition) {
              definition.register(event.container, server);
            }
          }
        }),
      on(StartHttpServer)
        .use(HttpServer)
        .do((options, server) => server.serve(options.port)),
      on(Shutdown)
        .use(HttpServer)
        .do((shutdown, server) => server.shutdown()),
    ];
  }
}

type HttpRouteInput<T extends new (...args: any[]) => any> = InstanceType<T> extends HttpRoute<
  infer I,
  unknown
>
  ? I
  : never;
type HttpRouteOutput<T extends new (...args: any[]) => any> = InstanceType<T> extends HttpRoute<
  unknown,
  infer O
>
  ? O
  : never;

export function http<T extends new (...args: any[]) => HttpRoute<any, any>>(
  route: T,
): HttpRouteDefinitionBuilder<HttpRouteInput<T>, HttpRouteOutput<T>> {
  return new HttpRouteDefinitionBuilder(route);
}
