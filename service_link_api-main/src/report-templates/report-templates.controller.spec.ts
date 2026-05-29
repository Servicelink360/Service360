import { Test, TestingModule } from '@nestjs/testing';
import { ReportTemplatesController } from './report-templates.controller';
import { ReportTemplatesService } from './report-templates.service';
import { errorCode } from '../constants/errorCode';

describe('ReportTemplatesController', () => {
  let controller: ReportTemplatesController;
  let service: ReportTemplatesService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportTemplatesController],
      providers: [
        {
          provide: ReportTemplatesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ReportTemplatesController>(ReportTemplatesController);
    service = module.get<ReportTemplatesService>(ReportTemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct parameters', async () => {
      const user = { userId: 1 };
      const createDto = {
        name: 'Test Template',
        description: 'Test Description',
      };

      mockService.create.mockResolvedValue(errorCode.SUCCESS);

      await controller.create(mockResponse, createDto, { user });

      expect(mockService.create).toHaveBeenCalledWith(user, createDto);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with correct id', async () => {
      const template = { id: 1, name: 'Test Template' };
      mockService.findOne.mockResolvedValue({ ...errorCode.SUCCESS, data: template });

      await controller.findOne(mockResponse, '1');

      expect(mockService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should call service.update with correct parameters', async () => {
      const user = { userId: 1 };
      const updateDto = { name: 'Updated Template' };

      mockService.update.mockResolvedValue(errorCode.SUCCESS);

      await controller.update(mockResponse, '1', updateDto, { user });

      expect(mockService.update).toHaveBeenCalledWith(user, '1', updateDto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with correct id', async () => {
      mockService.remove.mockResolvedValue(errorCode.SUCCESS);

      await controller.remove(mockResponse, '1');

      expect(mockService.remove).toHaveBeenCalledWith('1');
    });
  });
});
