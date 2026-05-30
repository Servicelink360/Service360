import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type DeployStatus = {
  status: 'ready' | 'deploying' | 'unknown';
  commit?: string;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
};

@Controller({ path: 'deploy-status', version: VERSION_NEUTRAL })
export class DeployStatusController {
  @Get()
  getStatus(): DeployStatus {
    const file = path.join(process.cwd(), 'deploy-status.json');
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as DeployStatus;
    } catch {
      return {
        status: 'unknown',
        message: 'No deploy info yet',
      };
    }
  }
}
