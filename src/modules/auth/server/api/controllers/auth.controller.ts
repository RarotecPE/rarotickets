import type { IUseCase } from '@core/application/use-case.interface';
import { HttpResponse } from '@server/api/http-response';
import { Controller } from '@server/api/controller.base';
import type { HttpRequestContext, RequestActor } from '@server/api/http-request.types';
import type { LoginInputDto } from '../../../application/use-cases/login/login.input.dto';
import type { LoginOutputDto } from '../../../application/use-cases/login/login.output.dto';
import type { LogoutInputDto } from '../../../application/use-cases/logout/logout.input.dto';
import type { LogoutOutputDto } from '../../../application/use-cases/logout/logout.output.dto';
import type { GetCurrentUserInputDto } from '../../../application/use-cases/get-current-user/get-current-user.input.dto';
import type { GetCurrentUserOutputDto } from '../../../application/use-cases/get-current-user/get-current-user.output.dto';
import type { AuthActionRequest } from '../dtos/auth.request.dto';

export type AuthControllerDependencies = {
  loginUseCase: IUseCase<LoginInputDto & { userAgent?: string | null; ip?: string | null }, LoginOutputDto>;
  logoutUseCase: IUseCase<LogoutInputDto, LogoutOutputDto>;
  getCurrentUserUseCase: IUseCase<GetCurrentUserInputDto, GetCurrentUserOutputDto>;
  sessionCookieName: string;
  sessionTtlMinutes: number;
  cookieSecure: boolean;
};

export class AuthController extends Controller<HttpRequestContext<AuthActionRequest>, HttpResponse> {
  private readonly dependencies: AuthControllerDependencies;

  constructor(dependencies: AuthControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<AuthActionRequest>): Promise<HttpResponse> {
    switch (request.body.action) {
      case 'login':
        return this.login(request.body, request);
      case 'logout':
        return this.logout(request);
      case 'me':
        return this.me(request.actor);
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }

  private async login(
    body: Extract<AuthActionRequest, { action: 'login' }>,
    request: HttpRequestContext<AuthActionRequest>,
  ): Promise<HttpResponse> {
    const result = await this.dependencies.loginUseCase.execute({
      email: body.email,
      password: body.password,
      userAgent: null,
      ip: request.ip,
    });
    if (result.isFailure) return HttpResponse.unauthorized(result.error.message, 'INVALID_CREDENTIALS');

    return HttpResponse.ok({ user: result.value.user, expiresAt: result.value.expiresAt }).withCookies([
      {
        name: this.dependencies.sessionCookieName,
        value: result.value.token,
        maxAgeSeconds: this.dependencies.sessionTtlMinutes * 60,
        httpOnly: true,
        secure: this.dependencies.cookieSecure,
        sameSite: 'lax',
      },
    ]);
  }

  private async logout(request: HttpRequestContext<AuthActionRequest>): Promise<HttpResponse> {
    const token = request.sessionToken ?? '';
    if (token) await this.dependencies.logoutUseCase.execute({ token });
    return HttpResponse.ok({ success: true }).withCookies([
      {
        name: this.dependencies.sessionCookieName,
        value: '',
        maxAgeSeconds: 0,
        httpOnly: true,
        secure: this.dependencies.cookieSecure,
        sameSite: 'lax',
      },
    ]);
  }

  private async me(actor: RequestActor | null): Promise<HttpResponse> {
    if (!actor) return HttpResponse.unauthorized();
    const result = await this.dependencies.getCurrentUserUseCase.execute({ userId: actor.userId });
    if (result.isFailure) return HttpResponse.unauthorized();
    return HttpResponse.ok(result.value);
  }
}
