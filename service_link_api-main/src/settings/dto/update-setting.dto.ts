import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateSettingDto } from './create-setting.dto';

export class UpdateSettingDto extends PartialType(CreateSettingDto) {}


export class UpdateBulkDto {
    @ApiProperty({
        default: [
            {
                settingKey: '',
                settingValue: '',
                settingLable:''
            }
        ]
    })
    items: UpdateSettingDto[]
}
