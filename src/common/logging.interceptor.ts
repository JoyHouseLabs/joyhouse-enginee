import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JoyhouseLoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: JoyhouseLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method, originalUrl, body } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const responseTime = Date.now() - startTime;
          this.logger.log(
            `${method} ${originalUrl} ${responseTime}ms\n` +
              `Request Body: ${JSON.stringify(body)}\n` +
              `Response: ${JSON.stringify(data)}\n` +
              `User-Agent: ${userAgent}`,
          );
        },
        error: (error: any) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `${method} ${originalUrl} ${responseTime}ms\n` +
              `Request Body: ${JSON.stringify(body)}\n` +
              `Error: ${error.message}\n` +
              `User-Agent: ${userAgent}`,
          );
        },
      }),
    );
  }
}
