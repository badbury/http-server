export class GetCompanies {
  handle(request: { limit: number }): { name: string }[] {
    if (request.limit > 200) throw new Error('Too big');
    return [{ name: 'Hutchhouse' }].slice(0, request.limit);
  }
}
