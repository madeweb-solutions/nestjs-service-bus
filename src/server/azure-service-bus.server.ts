import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { ServiceBusClient, ServiceBusReceiverOptions } from '@azure/service-bus';
import { Logger } from '@nestjs/common';
import { AzureServiceBusOptions } from '../interfaces/azure-service-bus.interface';

export class AzureServiceBusStrategy extends Server implements CustomTransportStrategy {
  protected readonly logger = new Logger(AzureServiceBusStrategy.name);
  private client: ServiceBusClient;
  private receiver: ReturnType<ServiceBusClient['createReceiver']>;

  constructor(private readonly options: AzureServiceBusOptions) {
    super();
  }

  async listen(callback: () => void) {
    this.client = new ServiceBusClient(
      this.options.connectionString,
      this.options.clientOptions,
    );

    const receiveMode = this.options.receiveMode ?? 'peekLock';
    const receiverOptions: ServiceBusReceiverOptions = { receiveMode };

    if (this.options.topicName && this.options.subscriptionName) {
      this.receiver = this.client.createReceiver(
        this.options.topicName,
        this.options.subscriptionName,
        receiverOptions,
      );
    } else {
      this.receiver = this.client.createReceiver(
        this.options.queueName!,
        receiverOptions,
      );
    }

    this.receiver.subscribe({
      processMessage: async (message) => {
        try {
          const rawPattern = message.applicationProperties?.pattern;
          const pattern = rawPattern != null
            ? JSON.parse(rawPattern as string)
            : this.getEntityPath();
          const handler = this.getHandlerByPattern(pattern);
          if (handler) {
            await handler(message.body);
          }
          if (receiveMode === 'peekLock') {
            await this.receiver.completeMessage(message);
          }
        } catch (err) {
          this.logger.error('Error processing message', err);
          if (receiveMode === 'peekLock') {
            await this.receiver.abandonMessage(message).catch((e) =>
              this.logger.error('Failed to abandon message', e),
            );
          }
        }
      },
      processError: async (args) => {
        this.logger.error('Azure Service Bus error', args.error);
      },
    });

    callback();
  }

  private getEntityPath(): string {
    return this.options.topicName ?? this.options.queueName!;
  }

  on<EventKey extends string = string, EventCallback extends Function = Function>(event: EventKey, callback: EventCallback) {
    this.logger.warn(`Event "${String(event)}" is not supported by AzureServiceBusStrategy`);
  }

  unwrap<T>(): T {
    return this.client as T;
  }

  async close() {
    await this.receiver?.close();
    await this.client?.close();
  }
}
