import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { GetCertificateInputDto } from '../../../application/use-cases/get-certificate/get-certificate.input.dto';
import type { GetCertificateOutputDto } from '../../../application/use-cases/get-certificate/get-certificate.output.dto';
import type { IssueCertificateInputDto } from '../../../application/use-cases/issue-certificate/issue-certificate.input.dto';
import type { IssueCertificateOutputDto } from '../../../application/use-cases/issue-certificate/issue-certificate.output.dto';
import type { ListCertificatesInputDto } from '../../../application/use-cases/list-certificates/list-certificates.input.dto';
import type { ListCertificatesOutputDto } from '../../../application/use-cases/list-certificates/list-certificates.output.dto';
import type { RevokeCertificateInputDto } from '../../../application/use-cases/revoke-certificate/revoke-certificate.input.dto';
import type { RevokeCertificateOutputDto } from '../../../application/use-cases/revoke-certificate/revoke-certificate.output.dto';
import type { ValidateCertificateInputDto } from '../../../application/use-cases/validate-certificate/validate-certificate.input.dto';
import type { ValidateCertificateOutputDto } from '../../../application/use-cases/validate-certificate/validate-certificate.output.dto';
import type { CertificateActionRequest } from '../dtos/certificate.request.types';

export type CertificateControllerDependencies = {
  issueCertificateUseCase: IUseCase<IssueCertificateInputDto, IssueCertificateOutputDto>;
  getCertificateUseCase: IUseCase<GetCertificateInputDto, GetCertificateOutputDto>;
  listCertificatesUseCase: IUseCase<ListCertificatesInputDto, ListCertificatesOutputDto>;
  validateCertificateUseCase: IUseCase<ValidateCertificateInputDto, ValidateCertificateOutputDto>;
  revokeCertificateUseCase: IUseCase<RevokeCertificateInputDto, RevokeCertificateOutputDto>;
};

/** Emissão, consulta e validação de certificados (§30 e §31). */
export class CertificateController extends Controller<HttpRequestContext<CertificateActionRequest>, HttpResponse> {
  private readonly dependencies: CertificateControllerDependencies;

  constructor(dependencies: CertificateControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<CertificateActionRequest>): Promise<HttpResponse> {
    switch (request.body.action) {
      case 'validate':
        return this.validate(request.body.code);
      case 'detail':
        return this.detail(request.body.code);
      case 'mine':
        return this.mine(request);
      case 'list': {
        const query = request.body.query;
        const result = await this.dependencies.listCertificatesUseCase.execute({
          eventId: query.eventId ?? null,
          participantId: query.participantId ?? null,
          search: query.search ?? null,
          page: query.page ? Number(query.page) : 1,
          perPage: query.perPage ? Number(query.perPage) : 20,
        });
        if (result.isFailure) return HttpResponse.serverError(result.error.message);
        return HttpResponse.ok(result.value.certificates, { ...result.value.meta });
      }
      case 'issue': {
        const actor = request.actor;
        const result = await this.dependencies.issueCertificateUseCase.execute({
          registrationId: request.body.registrationId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'Sistema',
          ip: request.ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'CERTIFICATE_ISSUE_FAILED');
        return result.value.alreadyIssued
          ? HttpResponse.ok(result.value)
          : HttpResponse.created(result.value);
      }
      case 'revoke': {
        const actor = request.actor;
        const result = await this.dependencies.revokeCertificateUseCase.execute({
          certificateId: request.body.certificateId,
          reason: request.body.body.reason ?? 'Cancelamento administrativo',
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'Operador',
          ip: request.ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'CERTIFICATE_REVOKE_FAILED');
        return HttpResponse.ok(result.value);
      }
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }

  private async validate(code: string): Promise<HttpResponse> {
    const result = await this.dependencies.validateCertificateUseCase.execute({ code });
    if (result.isFailure) return HttpResponse.badRequest(result.error.message);
    return HttpResponse.ok(result.value);
  }

  private async detail(code: string): Promise<HttpResponse> {
    const result = await this.dependencies.getCertificateUseCase.execute({ code });
    if (result.isFailure) return HttpResponse.notFound(result.error.message, 'CERTIFICATE_NOT_FOUND');
    return HttpResponse.ok(result.value);
  }

  private async mine(request: HttpRequestContext<CertificateActionRequest>): Promise<HttpResponse> {
    const participantId = request.participant?.participantId;
    if (!participantId) return HttpResponse.unauthorized('Sessão de participante necessária', 'PARTICIPANT_UNAUTHORIZED');

    const result = await this.dependencies.listCertificatesUseCase.execute({
      participantId,
      page: 1,
      perPage: 100,
    });
    if (result.isFailure) return HttpResponse.serverError(result.error.message);
    return HttpResponse.ok(result.value.certificates, { ...result.value.meta });
  }
}
