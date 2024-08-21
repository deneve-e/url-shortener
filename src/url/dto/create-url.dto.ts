import { IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUrlDto {
  @ApiProperty({
    description: 'The long URL to be shortened',
    example: 'https://example.com/very/long/url',
  })
  @IsUrl()
  @IsNotEmpty()
  longUrl: string;
}
