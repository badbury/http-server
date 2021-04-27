import { Context } from 'koa';
import { handler, HttpRoute } from '../../src';
import { GetUsers, GetUsersRequest, GetUsersResponse } from './use-case';

export class GetUsersHttpRoute extends HttpRoute<GetUsers, 'handle'> {
  method = 'post';
  route = '/users';
  handler = handler(GetUsers, 'handle');

  prepare(ctx: Context): GetUsersRequest {
    return {
      limit: Number(ctx.query.limit),
    };
  }

  present(ctx: Context, users: GetUsersResponse): void {
    ctx.body = {
      count: users.length,
      data: users,
    };
  }

  error(ctx: Context, error: Error): void {
    ctx.status = 400;
    ctx.body = 'Something went wrong - ' + error;
  }
}
