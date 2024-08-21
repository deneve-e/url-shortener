import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;
  let redisMock: jest.Mocked<Redis>;
  let loggerMock: jest.Mocked<Logger>;

  const mockRedisUrl = 'redis://mock.redis.url:6379';

  beforeEach(async () => {
    loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_URL') return mockRedisUrl;
              return null;
            }),
          },
        },
        {
          provide: Logger,
          useValue: loggerMock,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
    redisMock = (Redis as jest.MockedClass<typeof Redis>).mock
      .instances[0] as jest.Mocked<Redis>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create Redis client with correct configuration', () => {
    expect(Redis).toHaveBeenCalledWith(mockRedisUrl);
  });

  it('should throw error if Redis configuration is missing', () => {
    jest.spyOn(configService, 'get').mockReturnValue(undefined);
    expect(() => new RedisService(configService, loggerMock)).toThrow(
      'Redis configuration is missing',
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Redis configuration is missing',
    );
  });

  describe('set', () => {
    it('should set a key-value pair without TTL', async () => {
      redisMock.set.mockResolvedValue('OK');
      await service.set('testKey', 'testValue');
      expect(redisMock.set).toHaveBeenCalledWith('testKey', 'testValue');
      expect(loggerMock.debug).toHaveBeenCalledWith('Set key: testKey');
    });

    it('should set a key-value pair with TTL', async () => {
      redisMock.set.mockResolvedValue('OK');
      await service.set('testKey', 'testValue', 60);
      expect(redisMock.set).toHaveBeenCalledWith(
        'testKey',
        'testValue',
        'EX',
        60,
      );
      expect(loggerMock.debug).toHaveBeenCalledWith('Set key: testKey');
    });

    it('should throw an error if set operation fails', async () => {
      redisMock.set.mockRejectedValue(new Error('Redis error'));
      await expect(service.set('testKey', 'testValue')).rejects.toThrow(
        'Failed to set Redis key: testKey',
      );
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error setting key testKey: Redis error',
        expect.any(String),
      );
    });
  });

  describe('get', () => {
    it('should get a value by key', async () => {
      redisMock.get.mockResolvedValue('testValue');
      const result = await service.get('testKey');
      expect(result).toBe('testValue');
      expect(redisMock.get).toHaveBeenCalledWith('testKey');
      expect(loggerMock.debug).toHaveBeenCalledWith(
        'Get key: testKey, Value found: true',
      );
    });

    it('should return null if key does not exist', async () => {
      redisMock.get.mockResolvedValue(null);
      const result = await service.get('nonExistentKey');
      expect(result).toBeNull();
      expect(loggerMock.debug).toHaveBeenCalledWith(
        'Get key: nonExistentKey, Value found: false',
      );
    });

    it('should throw an error if get operation fails', async () => {
      redisMock.get.mockRejectedValue(new Error('Redis error'));
      await expect(service.get('testKey')).rejects.toThrow(
        'Failed to get Redis key: testKey',
      );
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error getting key testKey: Redis error',
        expect.any(String),
      );
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      redisMock.del.mockResolvedValue(1);
      await service.del('testKey');
      expect(redisMock.del).toHaveBeenCalledWith('testKey');
      expect(loggerMock.debug).toHaveBeenCalledWith('Deleted key: testKey');
    });

    it('should throw an error if del operation fails', async () => {
      redisMock.del.mockRejectedValue(new Error('Redis error'));
      await expect(service.del('testKey')).rejects.toThrow(
        'Failed to delete Redis key: testKey',
      );
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error deleting key testKey: Redis error',
        expect.any(String),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection', async () => {
      redisMock.quit.mockResolvedValue('OK');
      await service.onModuleDestroy();
      expect(redisMock.quit).toHaveBeenCalled();
      expect(loggerMock.log).toHaveBeenCalledWith('Redis connection closed');
    });

    it('should log error if closing connection fails', async () => {
      redisMock.quit.mockRejectedValue(new Error('Quit error'));
      await service.onModuleDestroy();
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error closing Redis connection: Quit error',
        expect.any(String),
      );
    });
  });
});
