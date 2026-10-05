/** Base de todo controller HTTP: recebe um request e devolve um response. */
export abstract class Controller<Request, Response> {
  abstract handle(request: Request): Promise<Response>;
}
