export type NotificationChannel = 'EMAIL' | 'WHATSAPP';

export type NotificationTemplate =
  | 'INSCRICAO_REALIZADA'
  | 'PAGAMENTO_PENDENTE'
  | 'PAGAMENTO_CONFIRMADO'
  | 'PAGAMENTO_RECUSADO'
  | 'INSCRICAO_CONFIRMADA'
  | 'INSCRICAO_CANCELADA'
  | 'ALTERACAO_NO_EVENTO'
  | 'EVENTO_PROXIMO'
  | 'EVENTO_CANCELADO'
  | 'CERTIFICADO_DISPONIVEL'
  | 'LISTA_ESPERA'
  | 'PROMOCAO_LISTA_ESPERA';

export type SendNotificationParams = {
  template: NotificationTemplate;
  registrationId?: string | null;
  eventId?: string | null;
  participantId?: string | null;
  destination?: string | null;
  variables?: Record<string, string>;
  channels?: NotificationChannel[];
};

/**
 * Gate de comunicações (§38). A implementação registra a comunicação e delega
 * o envio efetivo ao provider de e-mail/WhatsApp configurado.
 */
export interface INotificationGateway {
  send(params: SendNotificationParams): Promise<void>;
}

export const NOTIFICATION_GATEWAY = Symbol('INotificationGateway');
