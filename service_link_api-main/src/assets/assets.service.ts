import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { userType } from '../constants/user';
import { IUserInfo } from '../interfaces/IUserInfo';
import { CustomerCompany } from '../users/entities/customer-company.entity';
import { Asset } from './entities/asset.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { GetAssetsDto } from './dto/get-assets.dto';

const ASSET_STATUSES = new Set(['active', 'maintenance', 'retired', 'disposed']);
const CONDITIONS = new Set(['good', 'fair', 'poor', 'critical']);

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
    @InjectRepository(CustomerCompany)
    private readonly companyRepository: Repository<CustomerCompany>,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  private assertAdmin(userInfo: IUserInfo) {
    return +userInfo.type === userType.ADMIN;
  }

  private listDeletedTab(body: GetAssetsDto): boolean {
    return String(body.status || '').trim().toLowerCase() === 'deleted';
  }

  private normalizeStatus(raw?: string | null): string {
    const s = String(raw || 'active').trim().toLowerCase();
    return ASSET_STATUSES.has(s) ? s : 'active';
  }

  private normalizeCondition(raw?: string | null): string | null {
    if (raw == null || String(raw).trim() === '') return null;
    const s = String(raw).trim().toLowerCase();
    return CONDITIONS.has(s) ? s : String(raw).trim();
  }

  private async resolveCompany(companyId: number, fallbackName?: string) {
    const company = await this.companyRepository.findOne({ where: { id: +companyId } });
    if (!company) return null;
    return {
      companyId: +company.id,
      companyName: String(fallbackName || company.name || '').trim() || company.name,
    };
  }

  private buildListQuery(body: GetAssetsDto) {
    const listDeleted = this.listDeletedTab(body);
    const query = this.assetsRepository
      .createQueryBuilder('assets')
      .leftJoin('assets.createdUser', 'createdUser')
      .addSelect(['createdUser.fullName', 'createdUser.username']);

    if (listDeleted) {
      query.andWhere('assets.deleted_at IS NOT NULL');
    } else {
      query.andWhere('assets.deleted_at IS NULL');
    }

    if (body.keyword) {
      query.andWhere(
        `(assets.name ILIKE :keyword
          OR assets.asset_tag ILIKE :keyword
          OR assets.category ILIKE :keyword
          OR assets.company_name ILIKE :keyword
          OR assets.site_name ILIKE :keyword
          OR assets.serial_number ILIKE :keyword
          OR assets.model ILIKE :keyword
          OR assets.manufacturer ILIKE :keyword)`,
        { keyword: `%${body.keyword}%` },
      );
    }

    if (body.companyId) {
      query.andWhere('assets.company_id = :companyId', { companyId: +body.companyId });
    }

    if (body.assetStatus) {
      query.andWhere('assets.status = :assetStatus', {
        assetStatus: this.normalizeStatus(body.assetStatus),
      });
    }

    if (body.category) {
      query.andWhere('assets.category ILIKE :category', {
        category: `%${String(body.category).trim()}%`,
      });
    }

    const orderDir = body.orderValue === 'ASC' ? 'ASC' : 'DESC';
    const orderBy = body.orderBy || 'createdAt';
    const orderMap: Record<string, string> = {
      createdAt: 'assets.createdAt',
      name: 'assets.name',
      assetTag: 'assets.assetTag',
      category: 'assets.category',
      status: 'assets.status',
      companyName: 'assets.companyName',
      siteName: 'assets.siteName',
      condition: 'assets.condition',
      updatedAt: 'assets.updatedAt',
    };
    query.orderBy(orderMap[orderBy] || orderMap.createdAt, orderDir);
    return query;
  }

  async findAll(userInfo: IUserInfo, body: GetAssetsDto) {
    try {
      if (!this.assertAdmin(userInfo)) return errorCode.CAN_NOT_DELETE;
      const query = this.buildListQuery(body);
      if (+body.limit) {
        query.take(+body.limit).skip((+body.page - 1) * +body.limit);
      }
      const [rows, count] = await query.getManyAndCount();
      return { ...errorCode.SUCCESS, data: { count, rows } };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async countDeletedTab(userInfo: IUserInfo) {
    try {
      if (!this.assertAdmin(userInfo)) return { ...errorCode.SUCCESS, data: 0 };
      const count = await this.assetsRepository.count({
        where: { deletedAt: Not(IsNull()) },
      });
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async findOne(userInfo: IUserInfo, id: number) {
    try {
      if (!this.assertAdmin(userInfo)) return errorCode.CAN_NOT_DELETE;
      const asset = await this.assetsRepository.findOne({ where: { id: +id } });
      if (!asset) return errorCode.NOT_FOUND;
      return { ...errorCode.SUCCESS, data: asset };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async create(userInfo: IUserInfo, body: CreateAssetDto) {
    try {
      if (!this.assertAdmin(userInfo)) return errorCode.CAN_NOT_DELETE;
      if (!body.companyId || !String(body.name || '').trim()) {
        return errorCode.VALIDATION_ERROR;
      }
      const company = await this.resolveCompany(+body.companyId, body.companyName);
      if (!company) return errorCode.NOT_FOUND;

      const asset = this.assetsRepository.create({
        name: String(body.name).trim(),
        assetTag: body.assetTag?.trim() || null,
        category: body.category?.trim() || null,
        status: this.normalizeStatus(body.status),
        companyId: company.companyId,
        companyName: company.companyName,
        siteId: body.siteId ? +body.siteId : null,
        siteName: body.siteName?.trim() || null,
        locationDetail: body.locationDetail?.trim() || null,
        manufacturer: body.manufacturer?.trim() || null,
        model: body.model?.trim() || null,
        serialNumber: body.serialNumber?.trim() || null,
        installDate: body.installDate || null,
        warrantyExpiry: body.warrantyExpiry || null,
        condition: this.normalizeCondition(body.condition),
        notes: body.notes?.trim() || null,
        attachFiles: body.attachFiles || '[]',
        createdBy: +userInfo.userId,
        updatedBy: +userInfo.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      const saved = await this.assetsRepository.save(asset);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async update(userInfo: IUserInfo, id: number, body: UpdateAssetDto) {
    try {
      if (!this.assertAdmin(userInfo)) return errorCode.CAN_NOT_DELETE;
      const asset = await this.assetsRepository.findOne({ where: { id: +id } });
      if (!asset || asset.deletedAt) return errorCode.NOT_FOUND;

      if (body.companyId != null) {
        const company = await this.resolveCompany(+body.companyId, body.companyName);
        if (!company) return errorCode.NOT_FOUND;
        asset.companyId = company.companyId;
        asset.companyName = company.companyName;
      } else if (body.companyName !== undefined) {
        asset.companyName = String(body.companyName || '').trim() || asset.companyName;
      }

      if (body.name !== undefined) asset.name = String(body.name).trim();
      if (body.assetTag !== undefined) asset.assetTag = body.assetTag?.trim() || null;
      if (body.category !== undefined) asset.category = body.category?.trim() || null;
      if (body.status !== undefined) asset.status = this.normalizeStatus(body.status);
      if (body.siteId !== undefined) asset.siteId = body.siteId ? +body.siteId : null;
      if (body.siteName !== undefined) asset.siteName = body.siteName?.trim() || null;
      if (body.locationDetail !== undefined) {
        asset.locationDetail = body.locationDetail?.trim() || null;
      }
      if (body.manufacturer !== undefined) {
        asset.manufacturer = body.manufacturer?.trim() || null;
      }
      if (body.model !== undefined) asset.model = body.model?.trim() || null;
      if (body.serialNumber !== undefined) {
        asset.serialNumber = body.serialNumber?.trim() || null;
      }
      if (body.installDate !== undefined) asset.installDate = body.installDate || null;
      if (body.warrantyExpiry !== undefined) {
        asset.warrantyExpiry = body.warrantyExpiry || null;
      }
      if (body.condition !== undefined) {
        asset.condition = this.normalizeCondition(body.condition);
      }
      if (body.notes !== undefined) asset.notes = body.notes?.trim() || null;
      if (body.attachFiles !== undefined) asset.attachFiles = body.attachFiles || '[]';

      asset.updatedBy = +userInfo.userId;
      asset.updatedAt = new Date();
      const saved = await this.assetsRepository.save(asset);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async remove(userInfo: IUserInfo, id: number) {
    try {
      if (!this.assertAdmin(userInfo)) return errorCode.CAN_NOT_DELETE;
      const asset = await this.assetsRepository.findOne({ where: { id: +id } });
      if (!asset) return errorCode.NOT_FOUND;

      if (asset.deletedAt) {
        await this.assetsRepository.delete(+id);
        return errorCode.SUCCESS;
      }

      asset.deletedAt = new Date();
      asset.updatedBy = +userInfo.userId;
      asset.updatedAt = new Date();
      await this.assetsRepository.save(asset);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async restore(userInfo: IUserInfo, id: number) {
    try {
      if (!this.assertAdmin(userInfo)) return errorCode.CAN_NOT_DELETE;
      const asset = await this.assetsRepository.findOne({ where: { id: +id } });
      if (!asset?.deletedAt) return errorCode.NOT_FOUND;
      asset.deletedAt = null;
      asset.updatedBy = +userInfo.userId;
      asset.updatedAt = new Date();
      await this.assetsRepository.save(asset);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}
