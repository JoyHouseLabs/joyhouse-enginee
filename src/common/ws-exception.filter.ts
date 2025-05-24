import {
  Catch,
  ArgumentsHost,
  Logger,
  WsExceptionFilter as NestWsExceptionFilter,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter implements NestWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    
    let message = 'Internal server error';
    let code = 5000;
    let data = null;

    // 日志记录
    this.logger.error({
      socketId: client.id,
      message,
      code,
      exception: exception instanceof Error ? exception.stack : exception,
      time: new Date().toISOString(),
    });

    if (exception instanceof WsException) {
      const error = exception.getError();
      if (typeof error === 'string') {
        message = error;
      } else if (typeof error === 'object' && error !== null) {
        message = (error as any).message || message;
        code = (error as any).code || code;
        data = (error as any).data || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 发送错误信息给客户端
    client.emit('error', {
      code,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }
} 