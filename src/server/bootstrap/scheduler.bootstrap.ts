import type { Container } from '@server/di/container';

export type SchedulerHandle = { stop: () => void };

/**
 * Rotinas automáticas (§39): sincronização de status do evento, expiração de
 * reservas de vaga e reconciliação de pagamentos. Cada execução é isolada:
 * uma falha não interrompe as demais.
 */
export function startScheduler(params: { container: Container }): SchedulerHandle {
  const { container } = params;
  const { logger, useCases, config } = container;
  if (!config.scheduler.enabled) {
    logger.info('Agendador desabilitado por configuração.');
    return { stop: () => undefined };
  }

  const intervalMs = config.scheduler.intervalSeconds * 1000;
  let running = false;

  const runOnce = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const eventSync = await useCases.syncEventStatusesUseCase.execute({});
      if (eventSync.isSuccess && eventSync.value.changed.length > 0) {
        logger.info('Status de eventos sincronizados', { updated: eventSync.value.changed.length });
      }

      const expired = await useCases.expireReservationsUseCase.execute({ limit: 100 });
      if (expired.isSuccess && expired.value.expired.length > 0) {
        logger.info('Reservas de vaga expiradas', { expired: expired.value.expired.length });
      }
    } catch (error) {
      logger.error('Falha no ciclo do agendador', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      running = false;
    }
  };

  void runOnce();
  const timer = setInterval(() => void runOnce(), intervalMs);

  logger.info('Agendador iniciado', { intervalSeconds: config.scheduler.intervalSeconds });
  return { stop: () => clearInterval(timer) };
}

/** Reconciliação periódica de pagamentos (§21), em intervalo próprio. */
export function startPaymentReconciliation(params: { container: Container }): SchedulerHandle {
  const { container } = params;
  const { logger, useCases, config } = container;

  const runOnce = async (): Promise<void> => {
    try {
      const result = await useCases.reconcilePaymentsUseCase.execute({});
      if (result.isSuccess && result.value.checked > 0) {
        logger.info('Reconciliação de pagamentos executada', { ...result.value });
      }
    } catch (error) {
      logger.error('Falha na reconciliação de pagamentos', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const timer = setInterval(() => void runOnce(), config.payments.reconcileIntervalMinutes * 60 * 1000);
  return { stop: () => clearInterval(timer) };
}
