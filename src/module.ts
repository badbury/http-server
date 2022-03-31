import {
  bind,
  Definition,
  on,
  RegisterDefinitions,
  ServiceLocator,
  AbstractClass,
  callableSetter,
  Callable,
  EventSink,
  Shutdown,
} from '@badbury/ioc';
import { HttpRoute } from './http-route';
import { HttpServer, HttpServerConfig } from './http-server';

export class StartHttpServer {}
export class HttpServerStarted {}
export class HttpServerStopped {}
export class HttpServerStarting {}
export class HttpServerStopping {}

export class HttpRouteDefinition<I, O> implements Definition<HttpRouteDefinition<I, O>> {
  definition = HttpRouteDefinition;

  constructor(
    public readonly route: { prototype: HttpRoute<I, O> },
    private readonly callable: Callable<[I], [], O>,
  ) {}

  register(resolver: ServiceLocator, sink: EventSink, server: HttpServer): void {
    const route = resolver.get(this.route);
    server.use(route, (req: I) => this.callable.call([req], resolver, sink));
  }
}

export class HttpRouteDefinitionBuilder<I, O, A extends AbstractClass[] = []> {
  constructor(
    public readonly route: { prototype: HttpRoute<I, O> },
    public args: A = ([] as unknown) as A,
  ) {}

  use<P extends AbstractClass[]>(...args: P): HttpRouteDefinitionBuilder<I, O, P> {
    return new HttpRouteDefinitionBuilder(this.route, args);
  }

  do = callableSetter()
    .withPassedArgs<[I]>()
    .withContainerArgs(this.args)
    .withReturn<O>()
    .map((callable) => new HttpRouteDefinition(this.route, callable));
}

export class HttpModule {
  register(): Definition[] {
    return [
      bind(HttpServer),
      bind(HttpServerConfig),
      on(RegisterDefinitions)
        .use(HttpServer)
        .do((event, server) => {
          for (const definition of event.definitions) {
            if (definition instanceof HttpRouteDefinition) {
              definition.register(event.container, event.container, server);
            }
          }
        }),
      on(StartHttpServer)
        .use(HttpServer, HttpServerConfig)
        .do(async function* (_, server, config) {
          yield new HttpServerStarting();
          await server.connect(config);
          yield new HttpServerStarted();
        })
        .emit(),
      on(Shutdown)
        .use(HttpServer)
        .do(async function* (shutdown, server) {
          yield new HttpServerStopping();
          await server.disconnect();
          yield new HttpServerStopped();
        })
        .emit(),
    ];
  }
}

type HttpRouteInput<
  T extends new (...args: unknown[]) => unknown
> = InstanceType<T> extends HttpRoute<infer I, unknown> ? I : never;
type HttpRouteOutput<
  T extends new (...args: unknown[]) => unknown
> = InstanceType<T> extends HttpRoute<unknown, infer O> ? O : never;

export function http<T extends new (...args: unknown[]) => HttpRoute<unknown, unknown>>(
  route: T,
): HttpRouteDefinitionBuilder<HttpRouteInput<T>, HttpRouteOutput<T>> {
  return new HttpRouteDefinitionBuilder(route);
}
