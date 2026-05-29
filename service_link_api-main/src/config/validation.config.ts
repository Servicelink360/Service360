import { ValidatorOptions } from 'class-validator'
import { HttpStatus } from '@nestjs/common'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ValidationConfig: ValidatorOptions | Record<string, any> = {
  whitelist: true,
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  forbidNonWhitelisted: true,
  disableErrorMessages: false,
  skipMissingProperties: false,
}
