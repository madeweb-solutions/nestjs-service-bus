import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { ServiceBusClient, ServiceBusMessage } from '@azure/service-bus';
import { AzureServiceBusOptions } from '../interfaces/azure-service-bus.interface';

export class AzureServiceBusClient extends ClientProxy {
  private client: ServiceBusClient;

  constructor(private readonly options: AzureServiceBusOptions) {
    super();
    this.client = this.createClient();
  }

  private createClient(): ServiceBusClient {
    return new ServiceBusClient(
      this.options.connectionString,
      this.options.clientOptions,
    );
  }

  private getEntityPath(): string {
    return this.options.topicName ?? this.options.queueName!;
  }

  unwrap<T>(): T {
    return this.client as T;
  }

  async connect(): Promise<any> {
    if (!this.client) {
      this.client = this.createClient();
    }
  }

  async close() {
    await this.client?.close();
  }

  async dispatchEvent<T>(packet: ReadPacket<T>): Promise<T> {
    const sender = this.client.createSender(this.getEntityPath());
    try {
      const message: ServiceBusMessage = {
        body: packet.data,
      };
      if (packet.pattern != null) {
        message.applicationProperties = { pattern: JSON.stringify(packet.pattern) };
      }
      await sender.sendMessages(message);
    } finally {
      await sender.close();
    }
    return packet.data;
  }

  publish<T>(packet: ReadPacket<T>, callback: (packet: WritePacket<T>) => void): () => void {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      const sender = this.client.createSender(this.getEntityPath());
      try {
        const message: ServiceBusMessage = {
          body: packet.data,
        };
        if (packet.pattern != null) {
          message.applicationProperties = { pattern: JSON.stringify(packet.pattern) };
        }
        await sender.sendMessages(message);
        if (!cancelled) {
          callback({ response: packet.data });
        }
      } catch (err) {
        if (!cancelled) {
          callback({ err });
        }
      } finally {
        await sender.close();
      }
    })();

    return () => {
      cancelled = true;
    };
  }
}
