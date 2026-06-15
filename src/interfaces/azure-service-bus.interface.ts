import { ServiceBusClientOptions } from '@azure/service-bus';

export type AzureServiceBusReceiveMode = 'peekLock' | 'receiveAndDelete';

export interface AzureServiceBusOptions {
  connectionString: string;
  queueName?: string;
  topicName?: string;
  subscriptionName?: string;
  receiveMode?: AzureServiceBusReceiveMode;
  clientOptions?: ServiceBusClientOptions;
}
