export type GetUsersRequest = {
  limit: number;
};

export type GetUsersResponse = {
  name: string;
}[];

export class GetUsers {
  handle(request: GetUsersRequest): GetUsersResponse {
    if (request.limit > 200) throw new Error('Too big');
    return [{ name: 'Steve' }].slice(0, request.limit);
  }
}
