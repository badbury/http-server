import { Context } from 'koa';
import { HttpRouteFor } from '../../src';
import { GetUsers, GetUsersRequest, GetUsersResponse } from './get-users';

export class GetUsersHttpRoute extends HttpRouteFor<GetUsers, 'handle'> {
  method = 'get';
  route = '/users';

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
