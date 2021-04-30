import { Context } from 'koa';
import { handler, HttpRoute } from '../../src';
import { GetCompanies } from './get-companies';

export class GetCompaniesHttpRoute extends HttpRoute<GetCompanies, 'handle'> {
  method = 'post';
  route = '/companies';
  handler = handler(GetCompanies, 'handle');

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
