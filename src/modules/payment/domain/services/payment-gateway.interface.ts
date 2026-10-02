import type { PaymentMethod } from '../../../../@core/domain/types/payment.types.ts';
import type { PaymentStatus } from '../entities/payment.aggregate.ts';
import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';

export type GatewayCustomer = {
  email: string | null;
  document: string | null;
  name: string | null;
};
export type CreateGatewayChargeParams = {
  internalPaymentId: string;
  idempotencyKey: string;
  internalReference: string;
  amountInMinorUnits: number;
  method: PaymentMethod;
  installments: number;
  paymentInstrumentToken: string | null;
  customer: GatewayCustomer;
};
export type GatewayPaymentInstructions = {
  pixCopyAndPaste: string | null;
  pixQrCodeImageUrl: string | null;
  boletoLine: string | null;
  boletoUrl: string | null;
  boletoDueAt: Date | null;
};
export type GatewayChargeResult = {
  externalTransactionId: string;
  normalizedStatus: PaymentStatus;
  providerStatusCode: string;
  expiresAt: Date | null;
  instructions: GatewayPaymentInstructions;
};
export type GatewayOperationParams = {
  externalTransactionId: string;
  amountInMinorUnits: number;
  idempotencyKey: string;
  reason: string;
};
export type GatewayOperationResult = {
  succeeded: boolean;
  operationId: string;
  resultDescription: string | null;
};
export type GatewayStatusQuery = { externalTransactionId: string };

/** Adapter boundary for the official PagBank API; provider statuses are normalized before leaving it. */
export interface IPaymentGateway {
  createCharge(params: CreateGatewayChargeParams): Promise<Result<GatewayChargeResult, DomainError>>;
  cancelCharge(params: GatewayOperationParams): Promise<Result<GatewayOperationResult, DomainError>>;
  refundCharge(params: GatewayOperationParams): Promise<Result<GatewayOperationResult, DomainError>>;
  getStatus(params: GatewayStatusQuery): Promise<Result<PaymentStatus, DomainError>>;
}
