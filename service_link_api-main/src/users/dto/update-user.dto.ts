import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto)   {
   
    @ApiProperty({ default: 'admin', description: '', maxLength: 50 })
    // @IsNotEmpty()
    username: string

    @ApiProperty({ default: '', description: "A", maxLength: 300 })
    password: string

    @ApiProperty({ default: '' })
    @IsEmail()
    email: string

    @ApiProperty({ default: '' })
    fullName: string

    @ApiProperty({ default: 0 })
    status: number
    
    
    @ApiProperty({ default: [], type: 'array', items: { type: 'string' } })
    userRoles?: string[]


    @ApiProperty({ default: [], type: 'array', items: { type: 'string' } })
    groups?: any


    @ApiProperty({ required: true, default: '' })
    positionId: string
}
