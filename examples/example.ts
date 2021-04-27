import { Context } from 'koa';
import { HttpRoute, HttpServer, handler } from '../src';

// Domain
class GetUsers {
  handle(request: { limit: number }): { name: string }[] {
    if (request.limit > 200) throw new Error('Too big');
    return [{ name: 'Steve' }].slice(0, request.limit);
  }
}

type GetUsersRequest = Parameters<GetUsers['handle']>[0];
type GetUsersResponse = ReturnType<GetUsers['handle']>;

// HTTP Adapter
class GetUsersHttpRoute implements HttpRoute<GetUsers, 'handle'> {
  method = 'post';
  route = '/users';
  handler = handler(GetUsers, 'handle');

  prepare(ctx: Context): GetUsersRequest {
    return {
      limit: Number(ctx.query.limit),
    };
  }

  present(ctx: Context, users: GetUsersResponse) {
    ctx.body = {
      count: users.length,
      data: users,
    };
  }

  error(ctx: Context, error: Error) {
    ctx.status = 400;
    ctx.body = 'Something went wrong - ' + error;
  }
}

const server = new HttpServer([new GetUsersHttpRoute()]);

server.serve(8080);
