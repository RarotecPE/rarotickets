import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { OutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { INotificationProvider } from "@/modules/ticketing/domain/services/notification-provider.interface";

export type ProcessOutboxInputDto = { limit: number };
export type ProcessOutboxOutputDto = { processed: number; sent: number; failed: number; fallbackQueued: number };
export type ProcessOutboxDependencies = { outboxRepository: OutboxRepository; emailProvider: INotificationProvider; whatsappProvider: INotificationProvider };

export class ProcessOutboxUseCase extends UseCase<ProcessOutboxInputDto, ProcessOutboxOutputDto> {
  private readonly outboxRepository: OutboxRepository;
  private readonly emailProvider: INotificationProvider;
  private readonly whatsappProvider: INotificationProvider;
  constructor(dependencies: ProcessOutboxDependencies) {
    super();
    this.outboxRepository = dependencies.outboxRepository;
    this.emailProvider = dependencies.emailProvider;
    this.whatsappProvider = dependencies.whatsappProvider;
  }

  async execute(input: ProcessOutboxInputDto): Promise<Result<ProcessOutboxOutputDto>> {
    const messages = await this.outboxRepository.claimPending({ limit: input.limit });
    let sent = 0;
    let failed = 0;
    let fallbackQueued = 0;
    for (const message of messages) {
      const provider = message.channel === "whatsapp" ? this.whatsappProvider : this.emailProvider;
      try {
        await provider.send({ message });
        await this.outboxRepository.update({ id: message.id, status: "sent", attempts: message.attempts });
        sent += 1;
      } catch (error) {
        await this.outboxRepository.update({ id: message.id, status: "failed", attempts: message.attempts, lastError: safeErrorMessage(error) });
        failed += 1;
        const fallbackEmail = message.channel === "whatsapp" ? readPayloadString(message.payload, "email") : "";
        if (fallbackEmail) {
          await this.outboxRepository.enqueue({ channel: "email", recipient: fallbackEmail, subject: message.subject, template: message.template, payload: message.payload });
          fallbackQueued += 1;
        }
      }
    }
    return Result.ok({ processed: messages.length, sent, failed, fallbackQueued });
  }
}

function readPayloadString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida no provedor de notificações.";
}
