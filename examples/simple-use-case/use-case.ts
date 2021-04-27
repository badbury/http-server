export class GetUsers {
  handle(request: { limit: number }): { name: string }[] {
    if (request.limit > 200) throw new Error('Too big');
    return [{ name: 'Steve' }].slice(0, request.limit);
  }
}
