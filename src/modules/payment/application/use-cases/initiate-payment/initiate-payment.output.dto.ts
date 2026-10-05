import type { PaymentDto } from '../../mappers/payment.mapper';

export type InitiatePaymentOutputDto = {
  payment: PaymentDto;
  instructions: {
    method: string;
    qrCode: string | null;
    qrCodeImageUrl: string | null;
    boletoLine: string | null;
    boletoUrl: string | null;
    boletoDueDate: Date | null;
    expiresAt: Date | null;
    installments: number;
    installmentFormatted: string;
  };
};
