export type AuthorizedApplicationDto = {
  name: string;
  clientId: string;
  logoUrl: string | null;
  homepageUrl: string;
};

export type ListAuthorizedApplicationsOutputDto = { applications: AuthorizedApplicationDto[] };
