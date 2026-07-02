import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check health status of the application' })
  @ApiResponse({ status: 200, description: 'Application is running.' })
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
