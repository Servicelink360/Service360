import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { customHttpCode } from 'src/helpers/util';
import { IErrorData } from 'src/interfaces/IErrorData';
import { ContactService } from './contact.service';
import { ContactEnquiryDto } from './dto/contact-enquiry.dto';

@ApiTags('Contact')
@Controller({
  path: 'contact',
  version: ['1'],
})
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('enquiry')
  @ApiOperation({ summary: 'Public marketing site contact form' })
  async submitEnquiry(@Res() res, @Body() body: ContactEnquiryDto): Promise<IErrorData> {
    return customHttpCode(res, await this.contactService.submitEnquiry(body));
  }
}
