import {
  bind,
  Definition,
  on,
  RegisterDefinitions,
  ServiceLocator,
  Shutdown,
  AbstractClass,
  callableSetter,
  Callable,
  EventSink,
} from '@badbury/ioc';
import { HttpRoute } from './http-route';
import { HttpServer } from './http-server';

export class StartHttpServer {
  constructor(public readonly port: number) {}
}

export class HttpRouteDefinition<I, O> implements Definition<HttpRouteDefinition<I, O>> {
  definition = HttpRouteDefinition;

  constructor(
    public readonly route: { prototype: HttpRoute<I, O> },
    private readonly callable: Callable<[I], [], O>,
  ) {}

  register(resolver: ServiceLocator, sink: EventSink, server: HttpServer): void {
    const route = resolver.get(this.route);
    server.use(route, (req: I) => this.callable.handle([req], resolver, sink));
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
        .use(HttpServer)
        .do((options, server) => server.serve(options.port)),
      on(Shutdown)
        .use(HttpServer)
        .do((shutdown, server) => server.shutdown()),
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
