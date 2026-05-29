import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
    @ApiProperty({ description: '', default: 0 })
    userId: number

    @ApiProperty({ default: [], type: 'array', items: { type: 'string' } })
    userRoles: string[]
}
