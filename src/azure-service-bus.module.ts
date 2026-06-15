import { DynamicModule, Module } from '@nestjs/common';
import { AzureServiceBusOptions } from './interfaces/azure-service-bus.interface';
import { AzureServiceBusStrategy } from './server/azure-service-bus.server';

@Module({})
export class AzureServiceBusModule {
  static register(options: AzureServiceBusOptions): DynamicModule {
    return {
      module: AzureServiceBusModule,
      providers: [
        {
          provide: 'AZURE_SERVICE_BUS_STRATEGY',
          useFactory: () => new AzureServiceBusStrategy(options),
        },
      ],
      exports: ['AZURE_SERVICE_BUS_STRATEGY'],
    };
  }
}