export abstract class Controller<Request, Response> {
  protected constructor() {}
  abstract handle(request: Request): Promise<Response>;
}
