import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { ReportTemplatesService } from './report-templates.service';
import { ReportTemplate } from './entities/report-template.entity';
import { UserTasksService } from '../user-tasks/user-tasks.service';
import { errorCode } from '../constants/errorCode';
import { eStatus } from '../constants/status';

describe('ReportTemplatesService', () => {
  let service: ReportTemplatesService;
  let repository: Repository<ReportTemplate>;
  let userTasksService: UserTasksService;
  let logger: Logger;

  const mockRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserTasksService = {
    checkReportTemplate: jest.fn(),
    detachReportsFromReportTemplate: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportTemplatesService,
        {
          provide: getRepositoryToken(ReportTemplate),
          useValue: mockRepository,
        },
        {
          provide: 'winston',
          useValue: mockLogger,
        },
        {
          provide: UserTasksService,
          useValue: mockUserTasksService,
        },
      ],
    }).compile();

    service = module.get<ReportTemplatesService>(ReportTemplatesService);
    repository = module.get<Repository<ReportTemplate>>(getRepositoryToken(ReportTemplate));
    userTasksService = module.get<UserTasksService>(UserTasksService);
    logger = module.get<Logger>('winston');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a report template successfully', async () => {
      const userInfo = { userId: 1 };
      const createDto = {
        name: 'Test Template',
        description: 'Test Description',
        fileUrl: 'http://example.com/file',
        order: 1,
        items: [],
      };

      const savedTemplate = {
        id: 1,
        ...createDto,
        status: eStatus.YES,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userInfo.userId,
        updatedBy: userInfo.userId,
      };

      mockRepository.save.mockResolvedValue(savedTemplate);

      const result = await service.create(userInfo, createDto);

      expect(result).toEqual(errorCode.SUCCESS);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle errors when creating a report template', async () => {
      const userInfo = { userId: 1 };
      const createDto = {
        name: 'Test Template',
        description: 'Test Description',
        fileUrl: 'http://example.com/file',
        order: 1,
      };

      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await service.create(userInfo, createDto);

      expect(result).toEqual(errorCode.EXCEPTION);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find a report template by id', async () => {
      const template = {
        id: 1,
        name: 'Test Template',
        items: [],
      };

      mockRepository.findOne.mockResolvedValue(template);

      const result = await service.findOne('1');

      expect(result).toEqual({ ...errorCode.SUCCESS, data: template });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['items', 'createdUser', 'updatedUser'],
      });
    });

    it('should return NOT_FOUND when template does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('999');

      expect(result).toEqual(errorCode.NOT_FOUND);
    });
  });

  describe('remove', () => {
    it('should remove a report template successfully', async () => {
      const template = { id: 1 };
      mockUserTasksService.checkReportTemplate.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(template);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove('1');

      expect(result).toEqual(errorCode.SUCCESS);
      expect(mockUserTasksService.checkReportTemplate).toHaveBeenCalledWith('1');
      expect(mockRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should delete template but detach submitted reports when in use', async () => {
      const template = { id: 1, status: 1, name: 'Safety Check' };
      mockUserTasksService.checkReportTemplate.mockResolvedValue(3);
      mockUserTasksService.detachReportsFromReportTemplate.mockResolvedValue(3);
      mockRepository.findOne.mockResolvedValue(template);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove('1');

      expect(result.code).toBe(errorCode.SUCCESS.code);
      expect(mockUserTasksService.detachReportsFromReportTemplate).toHaveBeenCalledWith(
        1,
        'Safety Check',
      );
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect((result as { message?: string }).message).toContain('kept');
    });
  });
});
