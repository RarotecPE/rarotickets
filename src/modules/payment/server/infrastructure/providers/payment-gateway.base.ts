import type { Result } from '../../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../../@core/domain/domain-error.base.ts';
import type { PaymentStatus } from '../../../domain/entities/payment.aggregate.ts';
import type {
  CreateGatewayChargeParams,
  GatewayChargeResult,
  GatewayOperationParams,
  GatewayOperationResult,
  GatewayStatusQuery,
  IPaymentGateway,
} from '../../../domain/services/payment-gateway.interface.ts';

export abstract class PaymentGateway implements IPaymentGateway {
  abstract createCharge(params: CreateGatewayChargeParams): Promise<Result<GatewayChargeResult, DomainError>>;
  abstract cancelCharge(params: GatewayOperationParams): Promise<Result<GatewayOperationResult, DomainError>>;
  abstract refundCharge(params: GatewayOperationParams): Promise<Result<GatewayOperationResult, DomainError>>;
  abstract getStatus(params: GatewayStatusQuery): Promise<Result<PaymentStatus, DomainError>>;
}
