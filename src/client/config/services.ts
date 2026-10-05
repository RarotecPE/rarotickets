import { httpClient } from '../http/fetch-http-client';
import { AuthApiService } from '@modules/auth/client/services/auth-api.service';
import { UserApiService } from '@modules/auth/client/services/user-api.service';
import { ParticipantApiService } from '@modules/participant/client/services/participant-api.service';
import { EventApiService } from '@modules/event/client/services/event-api.service';
import { RegistrationApiService } from '@modules/registration/client/services/registration-api.service';
import { PaymentApiService } from '@modules/payment/client/services/payment-api.service';
import { CouponApiService } from '@modules/coupon/client/services/coupon-api.service';
import { CertificateApiService } from '@modules/certificate/client/services/certificate-api.service';
import { ReportApiService, REPORT_KEYS } from '@modules/report/client/services/report-api.service';
import type { ReportKey } from '@modules/report/client/services/report-api.service';
import { AuditApiService } from '@modules/audit/client/services/audit-api.service';
import { CheckInApiService } from '@modules/checkin/client/services/checkin-api.service';

/** Composition root do client: um serviço HTTP por módulo, no mesmo transporte. */
export const api = {
  auth: new AuthApiService({ httpClient }),
  users: new UserApiService({ httpClient }),
  participants: new ParticipantApiService({ httpClient }),
  events: new EventApiService({ httpClient }),
  registrations: new RegistrationApiService({ httpClient }),
  payments: new PaymentApiService({ httpClient }),
  coupons: new CouponApiService({ httpClient }),
  certificates: new CertificateApiService({ httpClient }),
  reports: new ReportApiService({ httpClient }),
  audit: new AuditApiService({ httpClient }),
  checkIn: new CheckInApiService({ httpClient }),
} as const;

export { REPORT_KEYS };
export type { ReportKey };
