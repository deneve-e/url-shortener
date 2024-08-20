import { Module } from '@nestjs/common';

import { RedisModule } from '../redis/redis.module';
import { DatabaseModule } from '../database/database.module';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';

@Module({
  imports: [RedisModule, DatabaseModule],
  controllers: [UrlController],
  providers: [UrlService],
})
export class UrlModule {}
