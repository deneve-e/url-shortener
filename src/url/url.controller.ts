import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Redirect,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UrlService } from './url.service';
import { CreateUrlDto } from './dto/create-url.dto';

@ApiTags('url')
@Controller('url')
@UseGuards(ThrottlerGuard)
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post()
  @ApiOperation({ summary: 'Shorten a URL' })
  @ApiResponse({ status: 201, description: 'The shortened URL' })
  create(@Body() createUrlDto: CreateUrlDto) {
    return this.urlService.create(createUrlDto);
  }

  @Get(':code')
  @Redirect()
  @ApiOperation({ summary: 'Redirect to original URL' })
  @ApiResponse({ status: 302, description: 'Redirect to original URL' })
  async findOne(@Param('code') code: string) {
    const url = await this.urlService.findOne(code);
    return { url };
  }

  @Get('stats/:code')
  @ApiOperation({ summary: 'Get URL statistics' })
  @ApiResponse({ status: 200, description: 'The URL statistics' })
  getStats(@Param('code') code: string) {
    return this.urlService.getStats(code);
  }
}
