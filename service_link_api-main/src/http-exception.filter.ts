import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { errorCode } from './constants/errorCode';
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<FastifyReply>();
        const status = exception.getStatus();
        const message: any = exception.getResponse();
        // Log the full error for debugging
        console.error('HttpException:', JSON.stringify(message, null, 2));
        response
            .status(status)
            .send({
                code: status == 401 ? errorCode.ACCOUNT_DOSE_NOT_EXIST.code : errorCode.EXCEPTION.code,
                message: status == 401 ? errorCode.ACCOUNT_DOSE_NOT_EXIST.message : message.message,
                details: message,
            });
    }
}