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

@Controller({ path: 'deploy-status', version: [VERSION_NEUTRAL, '1'] })
export class DeployStatusController {
  @Get()
  getStatus(): DeployStatus {
    const fromEnv = process.env.DEPLOY_STATUS;
    if (fromEnv) {
      return {
        status: fromEnv as DeployStatus['status'],
        commit: process.env.DEPLOY_COMMIT,
        startedAt: process.env.DEPLOY_STARTED_AT,
        finishedAt: process.env.DEPLOY_FINISHED_AT,
        message: process.env.DEPLOY_MESSAGE,
      };
    }
    const file = path.join(process.cwd(), 'deploy-status.json');
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as DeployStatus;
    } catch {
      return {
        status: 'unknown',
        message: 'No deploy info yet — waiting for auto-deploy',
      };
    }
  }
}
