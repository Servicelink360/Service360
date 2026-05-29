import { ApiProperty } from "@nestjs/swagger";
//technologies
const arr = ['ROLES', 'COMPANIES', 'GROUPS', 'SERVICES', 'POSITION', 'SITES', 'USERS'];
export class GetInitDataDto {
    @ApiProperty({ required: false, default: 'KO', enum: ["KO", "EN"] })
    languageId: string
    @ApiProperty({
        required: false,
        default: arr,
        description: arr.join(', ')
    })
    items: string[]

}