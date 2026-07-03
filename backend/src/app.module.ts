import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { IndexerModule } from './indexer/indexer.module';
import { MarketModule } from './market/market.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [HealthModule, PrismaModule, IndexerModule, MarketModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
