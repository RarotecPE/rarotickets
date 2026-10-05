import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { PublicLayout } from '@client/ui/layouts/public.layout';
import { AdminLayout } from '@client/ui/layouts/admin.layout';
import { RequireAdmin, RequireParticipant } from './guards';
import { EventsPage } from '@modules/event/client/ui/pages/events.page';
import { EventDetailPage } from '@modules/event/client/ui/pages/event-detail.page';
import { RegistrationPage } from '@modules/event/client/ui/pages/registration.page';
import { CheckoutPage } from '@modules/payment/client/ui/pages/checkout.page';
import { RegistrationStatusPage } from '@modules/registration/client/ui/pages/registration-status.page';
import { ParticipantAreaPage } from '@modules/registration/client/ui/pages/participant-area.page';
import { CertificateValidationPage } from '@modules/certificate/client/ui/pages/certificate-validation.page';
import { AdminLoginPage } from '@modules/auth/client/ui/pages/admin-login.page';
import { DashboardPage } from '@modules/report/client/ui/pages/dashboard.page';
import { AdminEventsPage } from '@modules/event/client/ui/pages/admin-events.page';
import { AdminEventDetailPage } from '@modules/event/client/ui/pages/admin-event-detail.page';
import { AdminRegistrationsPage } from '@modules/registration/client/ui/pages/admin-registrations.page';
import { AdminCheckInPage } from '@modules/checkin/client/ui/pages/admin-checkin.page';
import { AdminPaymentsPage } from '@modules/payment/client/ui/pages/admin-payments.page';
import { AdminCouponsPage } from '@modules/coupon/client/ui/pages/admin-coupons.page';
import { AdminReportsPage } from '@modules/report/client/ui/pages/admin-reports.page';
import { AdminUsersPage } from '@modules/auth/client/ui/pages/admin-users.page';
import { AdminAuditPage } from '@modules/audit/client/ui/pages/admin-audit.page';

/** Rotas da SPA (client) — nenhuma regra de negócio aqui, apenas navegação. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={ROUTES.home} element={<EventsPage />} />
        <Route path="/eventos/:slug" element={<EventDetailPage />} />
        <Route path="/eventos/:slug/inscricao/nova" element={<RegistrationPage />} />
        <Route path="/eventos/:slug/inscricao/:registrationId" element={<CheckoutPage />} />
        <Route path={ROUTES.registrationStatus(':code')} element={<RegistrationStatusPage />} />
        <Route path={ROUTES.certificateValidation(':code')} element={<CertificateValidationPage />} />
        <Route path={ROUTES.certificateValidation('')} element={<CertificateValidationPage />} />
        <Route path={ROUTES.participantArea} element={<ParticipantAreaPage />} />
        <Route element={<RequireParticipant />}>
          <Route path={`${ROUTES.participantArea}/inscricoes`} element={<ParticipantAreaPage />} />
        </Route>
      </Route>

      <Route path={ROUTES.adminLogin} element={<AdminLoginPage />} />

      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.adminDashboard} element={<DashboardPage />} />
          <Route path={ROUTES.adminEvents} element={<AdminEventsPage />} />
          <Route path="/admin/eventos/novo" element={<AdminEventDetailPage />} />
          <Route path="/admin/eventos/:eventId" element={<AdminEventDetailPage />} />
          <Route path="/admin/eventos/:eventId/detalhe" element={<AdminEventDetailPage />} />
          <Route path={ROUTES.adminRegistrations} element={<AdminRegistrationsPage />} />
          <Route path={ROUTES.adminCheckin} element={<AdminCheckInPage />} />
          <Route path={ROUTES.adminPayments} element={<AdminPaymentsPage />} />
          <Route path={ROUTES.adminCoupons} element={<AdminCouponsPage />} />
          <Route path={ROUTES.adminReports} element={<AdminReportsPage />} />
          <Route path={ROUTES.adminUsers} element={<AdminUsersPage />} />
          <Route path={ROUTES.adminAudit} element={<AdminAuditPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
