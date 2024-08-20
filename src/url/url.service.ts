import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';

import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { Url } from './entities/url.entity';

@Injectable()
export class UrlService {
  private readonly generateShortCode: () => string;

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
    const existingUrl = await this.databaseService.findByLongUrl(
      createUrlDto.longUrl,
    );
    if (existingUrl) return existingUrl;

    const shortCode = this.generateShortCode();
    const url = new Url(shortCode, createUrlDto.longUrl);

    await this.cacheUrl(url);
    await this.databaseService.saveUrl(url);

    return url;
  }

  async resolveUrl(code: string): Promise<string> {
    const cachedUrl = await this.redisService.get(code);
    if (cachedUrl) {
      await this.incrementClickCount(code);
      return cachedUrl;
    }

    const url = await this.databaseService.getUrl(code);
    if (!url) throw new NotFoundException('URL not found');

    await this.cacheUrl(url);
    await this.incrementClickCount(code);

    return url.longUrl;
  }

  async getStats(code: string): Promise<Url> {
    const url = await this.databaseService.getStats(code);
    if (!url) throw new NotFoundException('Stats not found');
    return url;
  }

  private async cacheUrl(url: Url): Promise<void> {
    await this.redisService.set(url.shortCode, url.longUrl);
  }

  private async incrementClickCount(code: string): Promise<void> {
    await this.databaseService.incrementClickCount(code);
  }
}
