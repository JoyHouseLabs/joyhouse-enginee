import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OperationLog } from './operation-log.entity';

@WebSocketGateway({ namespace: '/operation-log' })
export class OperationLogGateway {
  @WebSocketServer()
  server: Server;

  notify(log: OperationLog) {
    this.server.emit('operation-log', log);
  }
}
