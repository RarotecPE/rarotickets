export type ReconcilePaymentsOutputDto = {
  checked: number;
  applied: number;
  ignored: number;
  requiresReview: number;
  failures: Array<{ paymentId: string; reference: string; message: string }>;
};
