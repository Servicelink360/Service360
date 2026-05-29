import { Test, TestingModule } from '@nestjs/testing';
import { ReportFaultsController } from './report-faults.controller';
import { ReportFaultsService } from './report-faults.service';

describe('ReportFaultsController', () => {
  let controller: ReportFaultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportFaultsController],
      providers: [ReportFaultsService],
    }).compile();

    controller = module.get<ReportFaultsController>(ReportFaultsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
