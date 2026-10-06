export type ValidateInternalRedirectParams = {
  candidate: string | null;
  appBaseUrl: string | null;
};

const DEFAULT_INTERNAL_DESTINATION = '/dashboard';

export function validateInternalRedirect(params: ValidateInternalRedirectParams): string {
  const candidate = params.candidate?.trim();
  if (!candidate || !params.appBaseUrl || candidate.length > 2048) return DEFAULT_INTERNAL_DESTINATION;
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return DEFAULT_INTERNAL_DESTINATION;
  }
  if (candidate.startsWith('/api/') || candidate === '/login' || candidate === '/logout') {
    return DEFAULT_INTERNAL_DESTINATION;
  }

  try {
    const destination = new URL(candidate, params.appBaseUrl);
    const appOrigin = new URL(params.appBaseUrl).origin;
    if (destination.origin !== appOrigin) return DEFAULT_INTERNAL_DESTINATION;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_INTERNAL_DESTINATION;
  }
}
