import { Test, TestingModule } from '@nestjs/testing';
import { UserDailyJobsController } from './user-daily-jobs.controller';
import { UserDailyJobsService } from './user-daily-jobs.service';

describe('DailyJobsController', () => {
  let controller: UserDailyJobsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserDailyJobsController],
      providers: [UserDailyJobsService],
    }).compile();

    controller = module.get<UserDailyJobsController>(UserDailyJobsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
