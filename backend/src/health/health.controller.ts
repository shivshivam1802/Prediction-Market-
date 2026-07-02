import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get full platform health check indicators' })
  @ApiResponse({ status: 200, description: 'Return status of databases and RPC connections.' })
  getHealth() {
    return this.healthService.checkHealth();
  }
}
