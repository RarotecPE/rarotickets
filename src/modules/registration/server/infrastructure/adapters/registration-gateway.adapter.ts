import type {
  ConfirmRegistrationAfterPaymentParams,
  ConfirmRegistrationResult,
  ExpirePaymentReservationParams,
  IRegistrationGateway,
  RegistrationStatusSnapshot,
} from '@core/contracts/registration-gateway.contract';
import { COUPON_CATALOG } from '@core/contracts/coupon-catalog.contract';
import type { ICouponCatalog } from '@core/contracts/coupon-catalog.contract';
import { Result } from '@core/domain/result';
import type { Registration } from '../../../domain/entities/registration.entity';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';

export type RegistrationGatewayAdapterDependencies = {
  registrationRepository: IRegistrationRepository;
  couponCatalog: ICouponCatalog;
};

/**
 * Anti-Corruption Layer do contexto de inscrições para o contexto de
 * pagamentos. Toda decisão de vaga continua sob o bloqueio do evento (§3, §4).
 */
export class RegistrationGatewayAdapter implements IRegistrationGateway {
  private readonly registrationRepository: IRegistrationRepository;
  private readonly couponCatalog: ICouponCatalog;

  constructor(dependencies: RegistrationGatewayAdapterDependencies) {
    this.registrationRepository = dependencies.registrationRepository;
    this.couponCatalog = dependencies.couponCatalog;
  }

  async getSnapshot(params: { registrationId: string }): Promise<RegistrationStatusSnapshot | null> {
    const registration = await this.registrationRepository.findById(params.registrationId);
    return registration ? this.toSnapshot(registration) : null;
  }

  async markAwaitingPayment(params: {
    registrationId: string;
    paymentMethod: string;
    at: Date;
    reservationExpiresAt: Date | null;
  }): Promise<{ status: 'UPDATED' | 'IGNORED' | 'NOT_FOUND' }> {
    const registration = await this.registrationRepository.findById(params.registrationId);
    if (!registration) return { status: 'NOT_FOUND' };
    if (!registration.status.value.includes('PENDENTE')) return { status: 'IGNORED' };

    const result = registration.markAwaitingPayment({
      paymentMethod: params.paymentMethod,
      reservationExpiresAt: params.reservationExpiresAt,
    });
    if (result.isFailure) return { status: 'IGNORED' };

    await this.registrationRepository.update(registration);
    return { status: 'UPDATED' };
  }

  async confirmAfterPayment(params: ConfirmRegistrationAfterPaymentParams): Promise<ConfirmRegistrationResult> {
    const current = await this.registrationRepository.findById(params.registrationId);
    if (!current) return { status: 'NOT_FOUND' };
    if (current.status.isCancelled()) {
      return {
        status: 'CANCELLED_REQUIRES_REVIEW',
        message: 'Inscrição cancelada: pagamento aprovado deve seguir para avaliação financeira',
      };
    }
    if (current.status.isConfirmed()) return { status: 'ALREADY_CONFIRMED' };
    if (current.status.isWaitlisted()) {
      return { status: 'WAITLISTED', position: current.waitlistPosition ?? 1 };
    }

    const result = await this.registrationRepository.withSeatLock<ConfirmRegistrationResult>({
      eventId: current.eventId,
      handler: async (context) => {
        const registration = await context.findActiveRegistration({ participantId: current.participantId });
        if (!registration || !registration.id.equals(current.id)) return Result.ok({ status: 'NOT_FOUND' as const });
        if (registration.status.isConfirmed()) return Result.ok({ status: 'ALREADY_CONFIRMED' as const });

        const alreadyReservedByThisRegistration = registration.seatStatus.value === 'RESERVADA';
        if (!alreadyReservedByThisRegistration) {
          const usage = await context.seatUsage();
          if (usage.availableSeats <= 0) return Result.ok({ status: 'SEAT_UNAVAILABLE' as const });
        }

        const confirmResult = registration.confirm({ at: params.at, paymentMethod: params.paymentMethod });
        if (confirmResult.isFailure) {
          return Result.ok({ status: 'CANCELLED_REQUIRES_REVIEW' as const, message: confirmResult.error.message });
        }

        await context.save(registration);
        return Result.ok({ status: 'CONFIRMED' as const });
      },
    });

    return result.isSuccess ? result.value : { status: 'CANCELLED_REQUIRES_REVIEW', message: result.error.message };
  }

  async markPaymentFailed(params: { registrationId: string; reason: string; at: Date }): Promise<void> {
    const registration = await this.registrationRepository.findById(params.registrationId);
    if (!registration || registration.status.isConfirmed() || registration.status.isCancelled()) return;

    const cancelResult = registration.cancel({
      at: params.at,
      reason: params.reason.slice(0, 200),
      isAdministrative: true,
    });
    if (cancelResult.isFailure) return;

    await this.registrationRepository.update(registration);
    if (registration.couponCode) await this.couponCatalog.release({ registrationId: registration.id.toString() });
  }

  async expireReservation(params: ExpirePaymentReservationParams): Promise<void> {
    const registration = await this.registrationRepository.findById(params.registrationId);
    if (!registration) return;

    const result = registration.expireReservation({ at: params.at, reason: params.reason });
    if (result.isFailure) return;

    await this.registrationRepository.update(registration);
    if (registration.couponCode) await this.couponCatalog.release({ registrationId: registration.id.toString() });
  }

  private toSnapshot(registration: Registration): RegistrationStatusSnapshot {
    return {
      registrationId: registration.id.toString(),
      code: registration.code.value,
      eventId: registration.eventId,
      participantId: registration.participantId,
      status: registration.status.value,
      seatStatus: registration.seatStatus.value,
      finalAmountCents: registration.finalAmount.cents,
      reservationExpiresAt: registration.reservation.expiresAt,
      waitlistPosition: registration.waitlistPosition,
      isCourtesy: registration.isCourtesy,
      hasCheckedIn: registration.hasCheckedIn(),
      checkedInAt: registration.checkIn?.checkedInAt ?? null,
      confirmedAt: registration.confirmedAt,
    };
  }
}
