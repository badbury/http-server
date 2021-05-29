import { RouterContext as Context } from 'koa-tree-router';
import { HttpRoute } from '../../src';

export class GetCompaniesHttpRoute extends HttpRoute<{ limit: number }, { name: string }[]> {
  method = 'get';
  route = '/companies';

  prepare(ctx: Context): { limit: number } {
    return {
      limit: Number(ctx.query.limit),
    };
  }

  present(ctx: Context, companies: { name: string }[]): void {
    ctx.body = {
      count: companies.length,
      data: companies,
    };
  }

  error(ctx: Context, error: Error): void {
    ctx.status = 400;
    ctx.body = 'Something went wrong - ' + error;
  }
}
