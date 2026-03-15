import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ToolsModule } from './tools/tools.module';
import { OpenSearchModule } from './opensearch/opensearch.module';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ObservabilityModule,
    OpenSearchModule,
    ToolsModule,
  ],
})
export class AppModule {}
