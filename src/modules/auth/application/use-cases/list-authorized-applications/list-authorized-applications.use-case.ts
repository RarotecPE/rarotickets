import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import type { IRaroNexusProvider, RaroNexusApplicationSnapshot } from '../../../domain/services/raro-nexus-provider.interface';
import type { ListAuthorizedApplicationsInputDto } from './list-authorized-applications.input.dto';
import type { AuthorizedApplicationDto, ListAuthorizedApplicationsOutputDto } from './list-authorized-applications.output.dto';

export type ListAuthorizedApplicationsDependencies = {
  provider: IRaroNexusProvider;
  ownClientId: string;
};
type NullableWebUrl = string | null;

export class ListAuthorizedApplicationsUseCase extends UseCase<
  ListAuthorizedApplicationsInputDto,
  ListAuthorizedApplicationsOutputDto
> {
  private readonly provider: IRaroNexusProvider;
  private readonly ownClientId: string;

  constructor(dependencies: ListAuthorizedApplicationsDependencies) {
    super();
    this.provider = dependencies.provider;
    this.ownClientId = dependencies.ownClientId;
  }

  async execute(input: ListAuthorizedApplicationsInputDto): Promise<Result<ListAuthorizedApplicationsOutputDto>> {
    const applications = await this.provider.listApplications({ token: input.token });
    return Result.ok({ applications: this.toAuthorizedApplications(applications) });
  }

  private toAuthorizedApplications(applications: RaroNexusApplicationSnapshot[]): AuthorizedApplicationDto[] {
    return applications
      .filter((application) => application.active && application.clientId !== this.ownClientId)
      .filter((application) => this.isNavigableApplication(application))
      .map((application) => ({
        name: application.name,
        clientId: application.clientId,
        logoUrl: this.toSafeWebUrl(application.logoUrl),
        homepageUrl: application.homepageUrl as string,
      }));
  }

  private isNavigableApplication(application: RaroNexusApplicationSnapshot): boolean {
    return this.toSafeWebUrl(application.homepageUrl) !== null;
  }

  private toSafeWebUrl(value: NullableWebUrl): NullableWebUrl {
    if (!value) return null;
    try {
      const destination = new URL(value);
      return destination.protocol === 'https:' || destination.protocol === 'http:' ? destination.toString() : null;
    } catch {
      return null;
    }
  }
}
