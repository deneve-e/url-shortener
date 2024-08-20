import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { validate } from 'class-validator';

import { UrlService } from './url.service';
import { CreateUrlDto } from './dto/create-url.dto';

@ApiTags('url')
@Controller()
@UseGuards(ThrottlerGuard)
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post('shorten')
  @ApiOperation({ summary: 'Shorten a URL' })
  @ApiResponse({ status: 201, description: 'The shortened URL' })
  async create(@Body() createUrlDto: CreateUrlDto) {
    // Input validation
    const errors = await validate(createUrlDto);
    if (errors.length > 0) {
      throw new BadRequestException('Invalid URL');
    }

    return this.urlService.create(createUrlDto);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Redirect to original URL' })
  @ApiResponse({ status: 302, description: 'Redirect to original URL' })
  async redirect(@Param('code') code: string) {
    const longUrl = await this.urlService.resolveUrl(code);

    if (!longUrl) {
      throw new NotFoundException('Short URL not found');
    }

    return { url: longUrl, statusCode: 302 };
  }

  @Get('stats/:code')
  @ApiOperation({ summary: 'Get URL statistics' })
  @ApiResponse({ status: 200, description: 'The URL statistics' })
  async getStats(@Param('code') code: string) {
    const stats = await this.urlService.getStats(code);
    if (!stats) {
      throw new NotFoundException('Stats not found');
    }
    return stats;
  }
}
