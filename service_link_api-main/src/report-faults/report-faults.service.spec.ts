import { Test, TestingModule } from '@nestjs/testing';
import { ReportFaultsService } from './report-faults.service';

describe('ReportFaultsService', () => {
  let service: ReportFaultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportFaultsService],
    }).compile();

    service = module.get<ReportFaultsService>(ReportFaultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
