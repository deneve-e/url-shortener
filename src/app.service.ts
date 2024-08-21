import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck(): { status: string; timestamp: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }

  getApiInfo(): { name: string; version: string; description: string } {
    return {
      name: 'URL Shortener API',
      version: '1.0.0',
      description:
        'A simple URL shortener service with Redis caching and Firebase storage.',
    };
  }
}
