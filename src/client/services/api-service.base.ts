import type { HttpClient } from '../http/http-client.types';

export type ApiServiceDependencies = { httpClient: HttpClient };

/** Base de todos os serviços HTTP do client (um por módulo). */
export abstract class ApiService {
  protected readonly httpClient: HttpClient;

  protected constructor(dependencies: ApiServiceDependencies) {
    this.httpClient = dependencies.httpClient;
  }
}
