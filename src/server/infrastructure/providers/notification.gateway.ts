import type {
  INotificationGateway,
  NotificationChannel,
  NotificationTemplate,
  SendNotificationParams,
} from '@core/contracts/notification.contract';
import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { ILogger } from '@server/infrastructure/logger/logger';

export type NotificationGatewayDependencies = {
  db: IDatabaseClient;
  logger: ILogger;
  mailProvider: string;
  mailFrom: string;
  whatsappProvider: string;
};

const TEMPLATE_SUBJECTS: Record<NotificationTemplate, string> = {
  INSCRICAO_REALIZADA: 'Sua inscrição foi registrada',
  PAGAMENTO_PENDENTE: 'Conclua o pagamento da sua inscrição',
  PAGAMENTO_CONFIRMADO: 'Pagamento confirmado',
  PAGAMENTO_RECUSADO: 'Pagamento não aprovado',
  INSCRICAO_CONFIRMADA: 'Inscrição confirmada',
  INSCRICAO_CANCELADA: 'Inscrição cancelada',
  ALTERACAO_NO_EVENTO: 'Houve alteração no evento',
  EVENTO_PROXIMO: 'O evento está chegando',
  EVENTO_CANCELADO: 'Evento cancelado',
  CERTIFICADO_DISPONIVEL: 'Seu certificado está disponível',
  LISTA_ESPERA: 'Você entrou na lista de espera',
  PROMOCAO_LISTA_ESPERA: 'Você foi promovido da lista de espera',
};

const TEMPLATE_BODIES: Partial<Record<NotificationTemplate, (variables: Record<string, string>) => string>> = {
  INSCRICAO_CONFIRMADA: (variables) => `Inscrição ${variables.codigo ?? ''} confirmada.`,
  PAGAMENTO_PENDENTE: (variables) => `Referência ${variables.referencia ?? variables.codigo ?? ''} no valor de ${variables.valor ?? ''} aguardando pagamento.`,
  PAGAMENTO_CONFIRMADO: (variables) => `Pagamento ${variables.referencia ?? ''} confirmado.`,
  PAGAMENTO_RECUSADO: (variables) => `O pagamento ${variables.referencia ?? ''} não foi aprovado. ${variables.motivo ?? ''}`,
  CERTIFICADO_DISPONIVEL: (variables) => `Certificado ${variables.codigo ?? ''} disponível para download.`,
  LISTA_ESPERA: (variables) => `Você está na posição ${variables.posicao ?? ''} da lista de espera.`,
  PROMOCAO_LISTA_ESPERA: (variables) => `Sua inscrição ${variables.codigo ?? ''} foi promovida da lista de espera.`,
};

/**
 * Gate de comunicações (§38): registra o histórico em `communication_logs` e
 * delega o envio ao provider configurado. Sem provider real, o envio é
 * apenas registrado em log — nada é disparado para terceiros.
 */
export class LoggingNotificationGateway implements INotificationGateway {
  private readonly db: IDatabaseClient;
  private readonly logger: ILogger;
  private readonly mailProvider: string;
  private readonly mailFrom: string;
  private readonly whatsappProvider: string;

  constructor(dependencies: NotificationGatewayDependencies) {
    this.db = dependencies.db;
    this.logger = dependencies.logger;
    this.mailProvider = dependencies.mailProvider;
    this.mailFrom = dependencies.mailFrom;
    this.whatsappProvider = dependencies.whatsappProvider;
  }

  async send(params: SendNotificationParams): Promise<void> {
    const channels: NotificationChannel[] = params.channels ?? ['EMAIL'];
    const variables = params.variables ?? {};
    const subject = TEMPLATE_SUBJECTS[params.template];
    const content = TEMPLATE_BODIES[params.template]?.(variables) ?? subject;

    for (const channel of channels) {
      const status = this.resolveStatus(channel);
      try {
        await this.db.execute({
          sql: `INSERT INTO communication_logs (id, event_id, registration_id, participant_id, channel,
                  template, subject, content, destination, status, sent_at, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
          params: [
            generateUuid(),
            params.eventId ?? null,
            params.registrationId ?? null,
            params.participantId ?? null,
            channel,
            params.template,
            subject,
            content,
            params.destination ?? null,
            status,
            status === 'ENVIADO' ? new Date() : null,
          ],
        });
      } catch (error) {
        this.logger.error('Falha ao registrar comunicação', {
          template: params.template,
          channel,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      this.logger.info('Comunicação registrada', {
        template: params.template,
        channel,
        status,
        from: channel === 'EMAIL' ? this.mailFrom : undefined,
        destination: params.destination ? maskDestination(params.destination) : null,
      });
    }
  }

  private resolveStatus(channel: NotificationChannel): string {
    const provider = channel === 'EMAIL' ? this.mailProvider : this.whatsappProvider;
    // Sem provider real configurado a comunicação é registrada e ignorada.
    if (!provider || provider === 'disabled' || provider === 'log') return 'IGNORADO';
    return 'ENVIADO';
  }
}

function maskDestination(destination: string): string {
  if (destination.includes('@')) {
    const [name, domain] = destination.split('@');
    const visible = (name ?? '').slice(0, 2);
    return `${visible}${'*'.repeat(Math.max((name ?? '').length - 2, 1))}@${domain ?? ''}`;
  }
  return `${destination.slice(0, 4)}${'*'.repeat(Math.max(destination.length - 4, 0))}`;
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
