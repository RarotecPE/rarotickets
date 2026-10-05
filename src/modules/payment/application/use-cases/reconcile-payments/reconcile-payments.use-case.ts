import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { PAYMENT_PROVIDER } from '@core/contracts/payment-provider.contract';
import type { IPaymentProvider } from '@core/contracts/payment-provider.contract';
import { Result } from '@core/domain/result';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment-repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface';
import { PaymentStatusSyncService } from '../../services/payment-status-sync.service';
import type { ReconcilePaymentsInputDto } from './reconcile-payments.input.dto';
import type { ReconcilePaymentsOutputDto } from './reconcile-payments.output.dto';

export type ReconcilePaymentsDependencies = {
  paymentRepository: IPaymentRepository;
  paymentProvider: IPaymentProvider;
  syncService: PaymentStatusSyncService;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  defaultWindowHours: number;
  defaultLimit: number;
};

/**
 * Job de reconciliação (§21): consulta no provedor o status dos pagamentos
 * ainda abertos e aplica divergências — usada quando o webhook não chega.
 */
export class ReconcilePaymentsUseCase extends UseCase<ReconcilePaymentsInputDto, ReconcilePaymentsOutputDto> {
  private readonly dependencies: ReconcilePaymentsDependencies;

  constructor(dependencies: ReconcilePaymentsDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ReconcilePaymentsInputDto): Promise<Result<ReconcilePaymentsOutputDto>> {
    const { paymentRepository, paymentProvider, syncService, auditRecorder, clock } = this.dependencies;
    const at = clock.now();
    const windowHours = input.windowHours ?? this.dependencies.defaultWindowHours;
    const createdAfter = new Date(at.getTime() - windowHours * 60 * 60 * 1000);

    const pending = await paymentRepository.listPendingForReconciliation({
      createdAfter,
      limit: input.limit ?? this.dependencies.defaultLimit,
    });

    const failures: ReconcilePaymentsOutputDto['failures'] = [];
    let applied = 0;
    let ignored = 0;
    let requiresReview = 0;

    for (const payment of pending) {
      const chargeId = payment.transaction.providerChargeId;
      if (!chargeId) {
        failures.push({
          paymentId: payment.id.toString(),
          reference: payment.reference.value,
          message: 'Pagamento sem identificador de cobrança no provedor',
        });
        continue;
      }

      const remote = await paymentProvider.getCharge({ providerChargeId: chargeId });
      if (!remote) {
        failures.push({
          paymentId: payment.id.toString(),
          reference: payment.reference.value,
          message: 'Cobrança não encontrada no provedor',
        });
        continue;
      }

      const syncResult = await syncService.execute({
        payment,
        providerStatus: remote.providerStatus,
        at,
        source: 'RECONCILIACAO',
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? 'Job de reconciliação',
      });
      if (syncResult.isFailure) {
        failures.push({
          paymentId: payment.id.toString(),
          reference: payment.reference.value,
          message: syncResult.error.message,
        });
        continue;
      }

      if (syncResult.value.outcome === 'APPLIED') applied += 1;
      else if (syncResult.value.outcome === 'REQUIRES_REVIEW') requiresReview += 1;
      else ignored += 1;
    }

    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Job de reconciliação',
      action: 'PAYMENT_RECONCILIATION_EXECUTED',
      entity: 'payment',
      entityId: 'reconciliation',
      description: `Reconciliação executada: ${pending.length} pagamento(s) verificados`,
      after: { checked: pending.length, applied, ignored, requiresReview, failures: failures.length },
    });

    return Result.ok({ checked: pending.length, applied, ignored, requiresReview, failures });
  }
}
