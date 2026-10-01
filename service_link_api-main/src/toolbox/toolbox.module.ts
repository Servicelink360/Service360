import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { ToolboxAttendance } from './entities/toolbox-attendance.entity';
import { ToolboxSession } from './entities/toolbox-session.entity';
import { ToolboxTalk } from './entities/toolbox-talk.entity';
import { ToolboxController } from './toolbox.controller';
import { ToolboxService } from './toolbox.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ToolboxTalk, ToolboxSession, ToolboxAttendance, User]),
  ],
  controllers: [ToolboxController],
  providers: [ToolboxService],
})
export class ToolboxModule implements OnModuleInit {
  constructor(private readonly toolboxService: ToolboxService) {}

  async onModuleInit() {
    try {
      await this.toolboxService.ensureSeedTalks();
    } catch (e) {
      // tables may not exist until the schema patch finishes
    }
  }
}
