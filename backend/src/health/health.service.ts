import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  checkHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: 'UP (mocked)',
        cache: 'UP (mocked)',
        blockchainProvider: 'UP (mocked)',
      },
    };
  }
}
