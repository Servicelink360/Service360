import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsOptional } from "class-validator"

export class CreateUserDto {
    @ApiProperty({ default: '', description: 'Set from email on create/update', maxLength: 200, required: false })
    @IsOptional()
    username?: string

    @ApiProperty({ default: '', description: "A", maxLength: 300 })
    @IsNotEmpty()
    password: string

    @ApiProperty({ default: '' })
    @IsEmail()
    @IsOptional()
    email: string

    @ApiProperty({ default: 0 })
    type: number

    @ApiProperty({ required: false, default: '', maxLength: 100 })
    firstName: string


    @ApiProperty({ required: false, default: '', maxLength: 100 })
    lastName: string

    @ApiProperty({ default: '' })
    phone: string

    @ApiProperty({ default: '' })
    avatar: string

    @ApiProperty({ default: '' })
    gender: string

    @ApiProperty({ default: '' })
    dob: Date

    @ApiProperty({ default: '' })
    address: string

    @ApiProperty({ default: [], type: 'array', items: { type: 'string' } })
    userRoles?: string[]

    @ApiProperty({ required: false, default: [], type: 'array', items: { type: 'string' } })
    groups?: any

    @ApiProperty({ required: false, default: '' })
    position: string

    @ApiProperty({ required: false })
    @IsOptional()
    companyId?: number

    @ApiProperty({ default: '' })
    companyName: string
    @ApiProperty({ default: '' })
    companyEmail: string
    @ApiProperty({ default: '' })
    companyPhone: string

    @ApiProperty({ required: false, default: '' })
    city: string

    @ApiProperty({ required: false, default: '' })
    state: string

    @ApiProperty({ required: false, default: '' })
    postCode: string

    @ApiProperty({ required: false, default: '' })
    country: string

    @ApiProperty({ required: false, default: '' })
    website: string

    @ApiProperty({ required: false, default: '' })
    location: string

    @ApiProperty({ required: false, default: '' })
    landLine: string

    @ApiProperty({ required: false, default: '' })
    description: string

    @ApiProperty({ required: false, default: '' })
    sendLoginInfo: number

    @ApiProperty({ required: false, default: '' })
    showQrCode: number

    @ApiProperty({ required: false, default: '' })
    startDate: Date

    @ApiProperty({ required: false, default: '' })
    ratings: number

    @ApiProperty({ required: false, default: 0 })
    allowDelete: number
}

