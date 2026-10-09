import {
  ApiService,
  FetchHttpClient,
  type ApiServiceDependencies,
} from "./api-service.base";
import type { ParticipantEventItem } from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";

export type ParticipantProfile = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string;
};

export type ParticipantSessionResponse = {
  authenticated: boolean;
  participant: ParticipantProfile | null;
};

export type RequestRegistrationRequest = {
  cpf: string;
  email: string;
  redirect?: string;
};

export type RequestRegistrationResponse = {
  success: boolean;
  message: string;
  email: string;
};

export type ActivationInfoResponse = {
  email: string;
  cpf: string | null;
};

export type CompleteRegistrationRequest = {
  token: string;
  name: string;
  phone: string;
  birthDate?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  password: string;
  termsConsent: boolean;
  marketingConsent?: boolean;
};

export type CompleteRegistrationResponse = {
  participant: ParticipantProfile;
};

export type LoginPasswordRequest = {
  identifier: string;
  password: string;
};

export type LoginPasswordResponse = {
  participant: ParticipantProfile;
};

export type RequestOtpRequest = {
  identifier: string;
};

export type RequestOtpResponse = {
  success: boolean;
  emailMasked: string;
  message: string;
};

export type VerifyOtpRequest = {
  identifier: string;
  code: string;
};

export type VerifyOtpResponse = {
  participant: ParticipantProfile;
};

export type ParticipantEventsResponse = {
  events: ParticipantEventItem[];
};

export class ParticipantApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async requestRegistration(
    payload: RequestRegistrationRequest,
  ): Promise<RequestRegistrationResponse> {
    const response = await this.httpClient.request<RequestRegistrationResponse>({
      path: "/api/v1/participant/auth/register-request",
      method: "POST",
      body: payload,
    });
    return response.data;
  }

  async getActivationInfo(token: string): Promise<ActivationInfoResponse> {
    const response = await this.httpClient.request<ActivationInfoResponse>({
      path: `/api/v1/participant/auth/activation-token?token=${encodeURIComponent(token)}`,
      method: "GET",
    });
    return response.data;
  }

  async completeRegistration(
    payload: CompleteRegistrationRequest,
  ): Promise<CompleteRegistrationResponse> {
    const response = await this.httpClient.request<CompleteRegistrationResponse>({
      path: "/api/v1/participant/auth/complete-registration",
      method: "POST",
      body: payload,
    });
    return response.data;
  }

  async loginWithPassword(
    payload: LoginPasswordRequest,
  ): Promise<LoginPasswordResponse> {
    const response = await this.httpClient.request<LoginPasswordResponse>({
      path: "/api/v1/participant/auth/login-password",
      method: "POST",
      body: payload,
    });
    return response.data;
  }

  async requestOtp(payload: RequestOtpRequest): Promise<RequestOtpResponse> {
    const response = await this.httpClient.request<RequestOtpResponse>({
      path: "/api/v1/participant/auth/request-otp",
      method: "POST",
      body: payload,
    });
    return response.data;
  }

  async verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const response = await this.httpClient.request<VerifyOtpResponse>({
      path: "/api/v1/participant/auth/verify-otp",
      method: "POST",
      body: payload,
    });
    return response.data;
  }

  async getSession(): Promise<ParticipantSessionResponse> {
    const response = await this.httpClient.request<ParticipantSessionResponse>({
      path: "/api/v1/participant/auth/session",
      method: "GET",
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.httpClient.request({
      path: "/api/v1/participant/auth/logout",
      method: "POST",
    });
  }

  async getMyEvents(): Promise<ParticipantEventsResponse> {
    const response = await this.httpClient.request<ParticipantEventsResponse>({
      path: "/api/v1/participant/events",
      method: "GET",
    });
    return response.data;
  }
}

const httpClient = new FetchHttpClient();
export const participantApi = new ParticipantApiService({ httpClient });

