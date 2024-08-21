import { Test, TestingModule } from '@nestjs/testing';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreateUrlDto } from './dto/create-url.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { Url } from './entities/url.entity';
import { Response } from 'express';

// Mock the ThrottlerGuard and validate function
jest.mock('@nestjs/throttler', () => ({
  ThrottlerGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('class-validator', () => ({
  ...jest.requireActual('class-validator'),
  validate: jest.fn(),
}));

describe('UrlController', () => {
  let controller: UrlController;
  let urlService: jest.Mocked<UrlService>;
  let validateMock: jest.MockedFunction<typeof validate>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlController],
      providers: [
        {
          provide: UrlService,
          useValue: {
            create: jest.fn(),
            resolveUrl: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<UrlController>(UrlController);
    urlService = module.get<UrlService>(UrlService) as jest.Mocked<UrlService>;
    validateMock = validate as jest.MockedFunction<typeof validate>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if the DTO is invalid', async () => {
      const createUrlDto = { longUrl: '' }; // Invalid DTO

      // Mock validate to return validation errors
      validateMock.mockResolvedValue([
        {
          property: 'longUrl',
          constraints: { isUrl: 'longUrl must be a valid URL' },
        },
      ]);

      await expect(
        controller.create(createUrlDto as CreateUrlDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return the shortened URL if the DTO is valid', async () => {
      const createUrlDto = { longUrl: 'http://example.com' };
      const createdUrl = new Url('shortCode', createUrlDto.longUrl);

      // Mock validate to return no errors
      validateMock.mockResolvedValue([]);

      urlService.create.mockResolvedValue(createdUrl);

      const result = await controller.create(createUrlDto);
      expect(result).toEqual(createdUrl);
      expect(urlService.create).toHaveBeenCalledWith(createUrlDto);
    });
  });

  describe('redirect', () => {
    it('should redirect to the original URL if the short code exists', async () => {
      const code = 'shortCode';
      const longUrl = 'http://example.com';
      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      urlService.resolveUrl.mockResolvedValue(longUrl);

      await controller.redirect(code, res);

      expect(urlService.resolveUrl).toHaveBeenCalledWith(code);
      expect(res.redirect).toHaveBeenCalledWith(302, longUrl);
    });

    it('should throw NotFoundException if the short code does not exist', async () => {
      const code = 'nonExistentCode';
      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      urlService.resolveUrl.mockResolvedValue(null);

      await expect(controller.redirect(code, res)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return the stats if the short code exists', async () => {
      const code = 'shortCode';
      const stats = new Url(code, 'http://example.com', 10);

      urlService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(code);
      expect(result).toEqual(stats);
      expect(urlService.getStats).toHaveBeenCalledWith(code);
    });

    it('should throw NotFoundException if the stats do not exist', async () => {
      const code = 'nonExistentCode';

      urlService.getStats.mockResolvedValue(null);

      await expect(controller.getStats(code)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
