import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';

import { RedisService } from 'src/redis/redis.service';
import { DatabaseService } from 'src/database/database.service';

import { CreateUrlDto } from './dto/create-url.dto';
import { Url } from './entities/url.entity';

@Injectable()
export class UrlService {
  private generateShortCode: () => string;

  constructor(
    private readonly redisService: RedisService,
    private readonly databaseService: DatabaseService,
  ) {
    this.generateShortCode = customAlphabet(
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      6,
    );
  }

  async create(createUrlDto: CreateUrlDto): Promise<Url> {
    const shortCode = this.generateShortCode();
    const url = new Url(shortCode, createUrlDto.longUrl);

    await this.redisService.set(shortCode, url.longUrl);
    await this.databaseService.saveUrl(url);

    return url;
  }

  async findOne(code: string): Promise<string> {
    const cachedUrl = await this.redisService.get(code);
    if (cachedUrl) return cachedUrl;

    const url = await this.databaseService.getUrl(code);
    if (!url) throw new NotFoundException('URL not found');

    await this.redisService.set(code, url.longUrl);
    await this.databaseService.incrementClickCount(code);

    return url.longUrl;
  }

  async getStats(code: string): Promise<Url> {
    const url = await this.databaseService.getStats(code);
    if (!url) throw new NotFoundException('URL not found');
    return url;
  }
}
