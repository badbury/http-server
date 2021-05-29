import { RouterContext as Context } from 'koa-tree-router';
import { HttpRoute, HttpServer } from '../src';
import { GetCompanies } from './simple-use-case/get-companies';
import { GetCompaniesHttpRoute } from './simple-use-case/get-companies-http';
import { GetUsers } from './use-case-with-types/get-users';
import { GetUsersHttpRoute } from './use-case-with-types/get-users-http';

// Domain
class GetPosts {
  handle(request: { limit: number }): { title: string }[] {
    if (request.limit > 200) throw new Error('Too big');
    return [{ title: 'Do things' }].slice(0, request.limit);
  }
}

type GetPostsRequest = Parameters<GetPosts['handle']>[0];
type GetPostsResponse = ReturnType<GetPosts['handle']>;

// HTTP Adapter
class GetPostsHttpRoute implements HttpRoute<GetPostsRequest, GetPostsResponse> {
  method = 'get';
  route = '/posts';

  prepare(ctx: Context): GetPostsRequest {
    return {
      limit: Number(ctx.query.limit),
    };
  }

  present(ctx: Context, posts: GetPostsResponse) {
    ctx.body = {
      count: posts.length,
      data: posts,
    };
  }

  error(ctx: Context, error: Error) {
    ctx.status = 400;
    ctx.body = 'Something went wrong - ' + error;
  }
}

const server = new HttpServer();

server.use(new GetPostsHttpRoute(), (...args) => new GetPosts().handle(...args));
server.use(new GetUsersHttpRoute(), (...args) => new GetUsers().handle(...args));
server.use(new GetCompaniesHttpRoute(), (...args) => new GetCompanies().handle(...args));

// const containerServer = new HttpServerWithContainer();
// containerServer.useClass(GetUsersHttpRoute, GetUsers, 'handle');
server.serve(8080);
