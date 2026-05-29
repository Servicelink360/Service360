import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { CreateSettingDto } from './dto/create-setting.dto';
import { Setting } from './entities/setting.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserInfo } from '../interfaces/IUserInfo';
import { errorCode } from '../constants/errorCode';
import { UpdateBulkDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {

  constructor(
    @InjectRepository(Setting) private readonly settingRepository: Repository<Setting>,
    @Inject('winston') private readonly logger: Logger,
  ) { }

  async updateBulk(userInfo: IUserInfo, body: UpdateBulkDto) {
    try {
      if (body.items && body.items.length > 0)
        for (const item of body.items) {
          const guide = await this.settingRepository.findOne({ where: { settingKey: item.settingKey } });
          if (!guide) {
            const newGuide = new Setting();
            newGuide.settingKey = item.settingKey;
            newGuide.settingLable = item.settingLable;
            newGuide.settingValue = item.settingValue;
            newGuide.createdBy = userInfo.userId;
            newGuide.updatedBy = userInfo.userId;
            newGuide.createdAt = new Date();
            newGuide.updatedAt = new Date();
            await this.settingRepository.save(newGuide);
          } else {
            guide.settingValue = item.settingValue;
            guide.updatedBy = userInfo.userId;
            guide.updatedAt = new Date();
            await this.settingRepository.update({ settingKey: item.settingKey }, guide);
          }

        }
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async getSettingsAdmin() {
    try {
      const data = await this.settingRepository.createQueryBuilder('settings')
        .select(['settings.settingKey', 'settings.settingValue', 'settings.settingType', 'settings.settingLable'])
        .orderBy('settings.order','ASC')
        .getMany()
      if (!data) {
        return errorCode.NOT_FOUND
      }
      return { ...errorCode.SUCCESS, data: { count: data.length, rows: data} };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async getSettings() {
    try {
      const data = await this.settingRepository.createQueryBuilder('settings')
        .select(['settings.settingKey', 'settings.settingValue', 'settings.settingLable'])
        .getMany()
      if (!data) {
        return errorCode.NOT_FOUND
      }
      return { ...errorCode.SUCCESS, data: data };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

}
