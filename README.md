<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center"><a href="https://nestjs.com" target="_blank">NestJS</a> custom transport for <a href="https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview" target="_blank">Azure Service Bus</a>.</p>
    <p align="center">
<a href="https://www.npmjs.com/~luis199230" target="_blank"><img src="https://img.shields.io/npm/v/@madeweb/nestjs-service-bus.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~luis199230" target="_blank"><img src="https://img.shields.io/npm/l/@madeweb/nestjs-service-bus.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~luis199230" target="_blank"><img src="https://img.shields.io/npm/dm/@madeweb/nestjs-service-bus.svg" alt="NPM Downloads" /></a>
</p>

## Description

<a href="https://azure.microsoft.com/en-us/services/service-bus/#overview" target="_blank">Azure Service Bus</a> custom transport for NestJS microservices. Supports **queues** and **topics/subscriptions** with proper message routing via NestJS patterns.

### Installation

```bash
$ npm i --save @azure/service-bus @madeweb/nestjs-service-bus
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `connectionString` | `string` | — | Azure Service Bus connection string |
| `queueName` | `string` | — | Queue name (required when not using topics) |
| `topicName` | `string` | — | Topic name (required when not using queues) |
| `subscriptionName` | `string` | — | Subscription name (required with topics) |
| `receiveMode` | `'peekLock' \| 'receiveAndDelete'` | `'peekLock'` | Message receive mode |
| `clientOptions` | `ServiceBusClientOptions` | — | Azure SDK client options (retry, webSocket, userAgent) |

#### Client options (`clientOptions`)

Pass advanced options to the underlying `ServiceBusClient`:

```typescript
interface ServiceBusClientOptions {
  retryOptions?: RetryOptions;
  webSocketOptions?: WebSocketOptions;
  userAgentOptions?: UserAgentOptions;
}
```

## Usage

### Microservice server (consumer)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AzureServiceBusStrategy } from '@madeweb/nestjs-service-bus';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    strategy: new AzureServiceBusStrategy({
      connectionString: 'Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=<key>;SharedAccessKey=<key>',
      queueName: 'my-queue',
    }),
  });

  await app.listen();
}
bootstrap();
```

#### Handling messages

The pattern sent by the client is stored in the message's `applicationProperties` and used to route to the correct handler:

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class MessageController {
  @MessagePattern('order.created')
  async handleOrderCreated(@Payload() data: any) {
    console.log('Order created:', data);
  }

  @MessagePattern('order.cancelled')
  async handleOrderCancelled(@Payload() data: any) {
    console.log('Order cancelled:', data);
  }
}
```

### Client (producer)

```typescript
import { Injectable } from '@nestjs/common';
import { AzureServiceBusClient } from '@madeweb/nestjs-service-bus';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderService {
  private readonly client: AzureServiceBusClient;

  constructor() {
    this.client = new AzureServiceBusClient({
      connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION!,
      queueName: 'my-queue',
    });
  }

  async createOrder(data: any) {
    await this.client.connect();
    return firstValueFrom(this.client.emit('order.created', data));
  }
}
```

### Using Topics / Subscriptions

```typescript
// Server
new AzureServiceBusStrategy({
  connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION!,
  topicName: 'orders',
  subscriptionName: 'service-a',
  receiveMode: 'peekLock',
  clientOptions: {
    retryOptions: { maxRetries: 3 },
  },
});

// Client
new AzureServiceBusClient({
  connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION!,
  topicName: 'orders',
});
```

### Hybrid app (HTTP + microservice)

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    strategy: new AzureServiceBusStrategy({
      connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION!,
      queueName: process.env.AZURE_SERVICE_BUS_QUEUE!,
    }),
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

## Message routing

Messages are routed using the `pattern` field stored in the Azure Service Bus message `applicationProperties`. This allows a single queue/topic to handle multiple message patterns with different `@MessagePattern()` handlers — just like NestJS built-in transports (RabbitMQ, Redis, etc.).

## Error handling

- **PeekLock mode**: messages are automatically completed on success and abandoned on error
- **ReceiveAndDelete mode**: messages are removed from the broker on delivery (no settlement required)
- Server errors are logged via NestJS `Logger` instead of `console.error`

## Security and contributions

- Author - [Luis Benavides](https://github.com/luis199230)

## License

NestJS Azure Service Bus is [MIT licensed](LICENSE).
