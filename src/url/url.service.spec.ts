import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';

import { UrlService } from './url.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { Url } from './entities/url.entity';

describe('UrlService', () => {
  let service: UrlService;
  let redisService: jest.Mocked<RedisService>;
  let databaseService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        {
          provide: RedisService,
          useFactory: () => ({
            set: jest.fn(),
            get: jest.fn(),
          }),
        },
        {
          provide: DatabaseService,
          useFactory: () => ({
            findByLongUrl: jest.fn(),
            saveUrl: jest.fn(),
            getUrl: jest.fn(),
            getStats: jest.fn(),
            incrementClickCount: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<UrlService>(UrlService);
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
    databaseService = module.get(
      DatabaseService,
    ) as jest.Mocked<DatabaseService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return existing URL if it already exists', async () => {
      const createUrlDto: CreateUrlDto = {
        longUrl:
          'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
      };
      const existingUrl = new Url(
        'abc123',
        'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
      );
      databaseService.findByLongUrl.mockResolvedValue(existingUrl);

      const result = await service.create(createUrlDto);

      expect(result).toEqual(existingUrl);
      expect(databaseService.findByLongUrl).toHaveBeenCalledWith(
        'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
      );
      expect(databaseService.saveUrl).not.toHaveBeenCalled();
    });

    it('should create a new URL if it does not exist', async () => {
      const createUrlDto: CreateUrlDto = {
        longUrl:
          'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
      };
      databaseService.findByLongUrl.mockResolvedValue(null);

      const result = await service.create(createUrlDto);

      expect(result).toBeInstanceOf(Url);
      expect(result.longUrl).toBe(
        'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
      );
      expect(databaseService.saveUrl).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('resolveUrl', () => {
    it('should return cached URL if it exists in Redis', async () => {
      const shortCode = 'abc123';
      const longUrl =
        'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values';
      redisService.get.mockResolvedValue(longUrl);

      const result = await service.resolveUrl(shortCode);

      expect(result).toBe(longUrl);
      expect(redisService.get).toHaveBeenCalledWith(shortCode);
      expect(databaseService.getUrl).not.toHaveBeenCalled();
      expect(databaseService.incrementClickCount).toHaveBeenCalledWith(
        shortCode,
      );
    });

    it('should fetch URL from database if not in Redis', async () => {
      const shortCode = 'abc123';
      const url = new Url(
        shortCode,
        'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
      );
      redisService.get.mockResolvedValue(null);
      databaseService.getUrl.mockResolvedValue(url);

      const result = await service.resolveUrl(shortCode);

      expect(result).toBe(url.longUrl);
      expect(redisService.get).toHaveBeenCalledWith(shortCode);
      expect(databaseService.getUrl).toHaveBeenCalledWith(shortCode);
      expect(redisService.set).toHaveBeenCalled();
      expect(databaseService.incrementClickCount).toHaveBeenCalledWith(
        shortCode,
      );
    });

    it('should throw NotFoundException if URL is not found', async () => {
      const shortCode = 'abc123';
      redisService.get.mockResolvedValue(null);
      databaseService.getUrl.mockResolvedValue(null);

      await expect(service.resolveUrl(shortCode)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return URL stats if they exist', async () => {
      const shortCode = 'abc123';
      const url = new Url(
        shortCode,
        'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
        5,
      );
      databaseService.getStats.mockResolvedValue(url);

      const result = await service.getStats(shortCode);

      expect(result).toEqual(url);
      expect(databaseService.getStats).toHaveBeenCalledWith(shortCode);
    });

    it('should throw NotFoundException if stats are not found', async () => {
      const shortCode = 'abc123';
      databaseService.getStats.mockResolvedValue(null);

      await expect(service.getStats(shortCode)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
