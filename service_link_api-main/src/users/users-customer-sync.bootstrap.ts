import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from './users.service';

/** On API start, align every customer: type=CUSTOMER, shared company_id, clean company name. */
@Injectable()
export class UsersCustomerSyncBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersCustomerSyncBootstrap.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.usersService.syncAllCustomerProfiles();
    const synced = result?.data?.synced ?? 0;
    const failed = result?.data?.failed ?? 0;
    this.logger.log(`Customer profiles synced: ${synced} ok, ${failed} failed`);
  }
}
