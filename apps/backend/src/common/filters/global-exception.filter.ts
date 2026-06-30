import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = {
      statusCode: status,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        body = { statusCode: status, error: exception.name, message: res };
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        body = {
          statusCode: status,
          error: (r['error'] as string) ?? exception.name,
          message: Array.isArray(r['message'])
            ? (r['message'] as string[]).join('; ')
            : (r['message'] as string) ?? exception.message,
          code: r['code'] as string | undefined,
          ...(r['details'] !== undefined && { details: r['details'] }),
        };
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error on ${request.method} ${request.url}`, exception.stack);
    }

    response.status(status).json(body);
  }
}
