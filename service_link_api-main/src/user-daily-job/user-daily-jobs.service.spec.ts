import { Test, TestingModule } from '@nestjs/testing';
import { UserDailyJobsService } from './user-daily-jobs.service';

describe('DailyJobsService', () => {
  let service: UserDailyJobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserDailyJobsService],
    }).compile();

    service = module.get<UserDailyJobsService>(UserDailyJobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
