import { bind, Definition, on, RegisterDefinitions, ServiceLocator } from '../../ioc/src';
import { HttpRoute } from './http-route';
import { HttpServer } from './http-server';

export class StartHttpServer {
  constructor(public readonly port: number) {}
}
export class HttpRouteDefinition implements Definition<HttpRouteDefinition> {
  definition = HttpRouteDefinition;
  constructor(public readonly route: { prototype: HttpRoute }) {}
}

export class HttpModule {
  register(): Definition[] {
    return [
      bind(HttpServer).with(ServiceLocator),
      on(RegisterDefinitions)
        .use(HttpServer)
        .do((event, server) => {
          for (const definition of event.definitions) {
            if (definition instanceof HttpRouteDefinition) {
              server.use(event.container.get(definition.route));
            }
          }
        }),
      on(StartHttpServer)
        .use(HttpServer)
        .do((options, server) => server.serve(options.port)),
    ];
  }
}

export function http<T extends { prototype: HttpRoute }>(route: T): HttpRouteDefinition {
  return new HttpRouteDefinition(route);
}
