import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getHealthCheck', () => {
    it('should return health check info', () => {
      const result = { status: 'OK', timestamp: '2024-08-21T12:00:00.000Z' };
      jest.spyOn(appService, 'getHealthCheck').mockImplementation(() => result);

      expect(appController.getHealthCheck()).toBe(result);
    });
  });

  describe('getApiInfo', () => {
    it('should return API information', () => {
      const result = {
        name: 'URL Shortener API',
        version: '1.0.0',
        description:
          'A simple URL shortener service with Redis caching and Firebase storage.',
      };
      jest.spyOn(appService, 'getApiInfo').mockImplementation(() => result);

      expect(appController.getApiInfo()).toBe(result);
    });
  });
});
