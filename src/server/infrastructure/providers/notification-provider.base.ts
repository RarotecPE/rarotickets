import type { INotificationProvider, DeliverNotificationParams } from "@/modules/ticketing/domain/services/notification-provider.interface";

export abstract class NotificationProvider implements INotificationProvider {
  abstract send(params: DeliverNotificationParams): Promise<void>;
}
