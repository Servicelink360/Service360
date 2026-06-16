import { Injectable, Logger } from '@nestjs/common';
import config from 'src/config';
import { errorCode } from 'src/constants/errorCode';
import { IErrorData } from 'src/interfaces/IErrorData';
import { SendMail, isMailConfigured } from '../helpers/sendEmail';
import { ContactEnquiryDto } from './dto/contact-enquiry.dto';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const contactInbox = (): string =>
  String(config.CONTACT_EMAIL || 'helpdesk@servicelink.net.au').trim();

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  async submitEnquiry(body: ContactEnquiryDto): Promise<IErrorData> {
    try {
      if (!isMailConfigured()) {
        this.logger.error('Contact enquiry skipped: mail not configured');
        return {
          code: 2,
          message: 'Message service is temporarily unavailable. Please email helpdesk@servicelink.net.au directly.',
        };
      }

      const name = body.name.trim();
      const email = body.email.trim().toLowerCase();
      const message = body.message.trim();
      const to = contactInbox();
      const subject = `Service360 website enquiry from ${name}`;
      const html = `<p><strong>New contact form submission</strong></p>
<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
<p><strong>Message:</strong></p>
<p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`;

      const sent = await SendMail(to, subject, html, {
        replyTo: { email, name },
      });
      if (!sent) {
        return {
          code: 2,
          message: 'Could not send your message. Please try again or email helpdesk@servicelink.net.au directly.',
        };
      }

      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}
