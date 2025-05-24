import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WsJwtAuthGuard } from '../../auth/guards/ws-jwt-auth.guard';
import { WsExceptionFilter } from '../../common/ws-exception.filter';
import { CollaborationRoom } from '../entities/collaboration-room.entity';
import { CollaborationTask } from '../entities/collaboration-task.entity';
import {
  CollaborationMessage,
  SenderType,
} from '../entities/collaboration-message.entity';
import { User } from '../../user/user.entity';
import { SendMessageDto } from '../dto/collaboration.dto';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseGuards(WsJwtAuthGuard)
@UseFilters(WsExceptionFilter)
export class CollaborationRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationRealtimeGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // roomId -> Set<socketId>
  private readonly userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    @InjectRepository(CollaborationRoom)
    private readonly roomRepo: Repository<CollaborationRoom>,
    @InjectRepository(CollaborationTask)
    private readonly taskRepo: Repository<CollaborationTask>,
    @InjectRepository(CollaborationMessage)
    private readonly messageRepo: Repository<CollaborationMessage>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = client.user;
      if (!user) {
        this.logger.warn(`Unauthenticated connection attempt: ${client.id}`);
        client.disconnect();
        return;
      }

      this.logger.log(`User ${user.username} connected: ${client.id}`);
      this.userSockets.set(user.id, client.id);

      // 发送连接确认
      client.emit('connected', {
        message: 'Connected to collaboration service',
        userId: user.id,
        username: user.username,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('auth-error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.user;
    if (user) {
      this.logger.log(`User ${user.username} disconnected: ${client.id}`);
      this.userSockets.delete(user.id);

      // 从所有房间中移除用户
      for (const [roomId, socketIds] of this.connectedUsers.entries()) {
        if (socketIds.has(client.id)) {
          socketIds.delete(client.id);
          if (socketIds.size === 0) {
            this.connectedUsers.delete(roomId);
          }

          // 通知房间内其他用户
          client.to(roomId).emit('user-left', {
            userId: user.id,
            username: user.username,
            timestamp: new Date(),
          });
        }
      }
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const user = client.user;
      if (!user) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const { roomId } = data;

      // 验证用户是否有权限加入房间
      const room = await this.roomRepo.findOne({
        where: { id: roomId },
        relations: ['participants', 'agents', 'creator'],
      });

      if (!room) {
        client.emit('error', { message: 'Room not found' });
        return;
      }

      const hasPermission =
        room.creator.id === user.id ||
        room.participants.some((p) => p.id === user.id);

      if (!hasPermission) {
        client.emit('error', { message: 'No permission to join this room' });
        return;
      }

      // 加入房间
      await client.join(roomId);

      // 记录连接
      if (!this.connectedUsers.has(roomId)) {
        this.connectedUsers.set(roomId, new Set());
      }
      this.connectedUsers.get(roomId)!.add(client.id);

      // 获取房间最近的消息
      const recentMessages = await this.messageRepo.find({
        where: { room: { id: roomId } },
        relations: ['user', 'agent', 'relatedTask'],
        order: { createdAt: 'DESC' },
        take: 50,
      });

      // 获取房间的活跃任务
      const activeTasks = await this.taskRepo.find({
        where: { room: { id: roomId } },
        relations: ['creator', 'steps', 'evaluations'],
        order: { createdAt: 'DESC' },
        take: 10,
      });

      // 发送房间状态
      client.emit('room-joined', {
        roomId,
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          status: room.status,
          participants: room.participants.map((p) => ({
            id: p.id,
            username: p.username,
          })),
          agents: room.agents.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
          })),
        },
        recentMessages: recentMessages.reverse(),
        activeTasks,
        timestamp: new Date(),
      });

      // 通知房间内其他用户
      client.to(roomId).emit('user-joined', {
        userId: user.id,
        username: user.username,
        timestamp: new Date(),
      });

      this.logger.log(`User ${user.username} joined room ${roomId}`);
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const user = client.user;
      if (!user) return;

      const { roomId } = data;

      await client.leave(roomId);

      // 移除连接记录
      const socketIds = this.connectedUsers.get(roomId);
      if (socketIds) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.connectedUsers.delete(roomId);
        }
      }

      // 通知房间内其他用户
      client.to(roomId).emit('user-left', {
        userId: user.id,
        username: user.username,
        timestamp: new Date(),
      });

      client.emit('room-left', { roomId, timestamp: new Date() });

      this.logger.log(`User ${user.username} left room ${roomId}`);
    } catch (error) {
      this.logger.error(`Error leaving room: ${error.message}`);
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto & { roomId: string },
  ) {
    try {
      const user = client.user;
      if (!user) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const { roomId, ...messageData } = data;

      // 验证用户是否在房间中
      const room = await this.roomRepo.findOne({
        where: { id: roomId },
        relations: ['participants', 'creator'],
      });

      if (!room) {
        client.emit('error', { message: 'Room not found' });
        return;
      }

      const hasPermission =
        room.creator.id === user.id ||
        room.participants.some((p) => p.id === user.id);

      if (!hasPermission) {
        client.emit('error', {
          message: 'No permission to send message in this room',
        });
        return;
      }

      // 创建消息
      const message = this.messageRepo.create({
        content: messageData.content,
        type: messageData.type,
        senderType: SenderType.USER,
        user,
        room,
        relatedTask: messageData.relatedTaskId
          ? { id: messageData.relatedTaskId }
          : undefined,
        attachments: messageData.attachments,
        mentions: messageData.mentions,
        metadata: messageData.metadata,
      });

      const savedMessage = await this.messageRepo.save(message);

      // 广播消息到房间
      this.server.to(roomId).emit('message-received', {
        id: savedMessage.id,
        content: savedMessage.content,
        type: savedMessage.type,
        senderType: savedMessage.senderType,
        user: {
          id: user.id,
          username: user.username,
        },
        attachments: savedMessage.attachments,
        mentions: savedMessage.mentions,
        metadata: savedMessage.metadata,
        createdAt: savedMessage.createdAt,
        timestamp: new Date(),
      });

      // 处理@提及
      if (messageData.mentions && messageData.mentions.length > 0) {
        for (const mention of messageData.mentions) {
          if (mention.type === 'user') {
            const mentionedUserSocketId = this.userSockets.get(mention.id);
            if (mentionedUserSocketId) {
              this.server.to(mentionedUserSocketId).emit('mentioned', {
                messageId: savedMessage.id,
                roomId,
                mentionedBy: {
                  id: user.id,
                  username: user.username,
                },
                content: messageData.content,
                timestamp: new Date(),
              });
            }
          }
        }
      }

      this.logger.log(`Message sent by ${user.username} in room ${roomId}`);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('subscribe-task')
  async handleSubscribeTask(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { taskId: string },
  ) {
    try {
      const user = client.user;
      if (!user) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const { taskId } = data;

      // 验证用户是否有权限订阅任务
      const task = await this.taskRepo.findOne({
        where: { id: taskId },
        relations: ['room', 'room.participants', 'room.creator'],
      });

      if (!task) {
        client.emit('error', { message: 'Task not found' });
        return;
      }

      const hasPermission =
        task.room.creator.id === user.id ||
        task.room.participants.some((p) => p.id === user.id);

      if (!hasPermission) {
        client.emit('error', {
          message: 'No permission to subscribe to this task',
        });
        return;
      }

      await client.join(`task-${taskId}`);

      client.emit('task-subscribed', {
        taskId,
        timestamp: new Date(),
      });

      this.logger.log(`User ${user.username} subscribed to task ${taskId}`);
    } catch (error) {
      this.logger.error(`Error subscribing to task: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to task' });
    }
  }

  @SubscribeMessage('unsubscribe-task')
  async handleUnsubscribeTask(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { taskId: string },
  ) {
    try {
      const { taskId } = data;

      await client.leave(`task-${taskId}`);

      client.emit('task-unsubscribed', {
        taskId,
        timestamp: new Date(),
      });

      this.logger.log(
        `User ${client.user?.username} unsubscribed from task ${taskId}`,
      );
    } catch (error) {
      this.logger.error(`Error unsubscribing from task: ${error.message}`);
    }
  }

  // 事件监听器

  @OnEvent('collaboration.message.sent')
  handleMessageSent(payload: any) {
    const { roomId, message } = payload;

    this.server.to(roomId).emit('message-received', {
      id: message.id,
      content: message.content,
      type: message.type,
      senderType: message.senderType,
      user: message.user
        ? {
            id: message.user.id,
            username: message.user.username,
          }
        : undefined,
      agent: message.agent
        ? {
            id: message.agent.id,
            name: message.agent.name,
          }
        : undefined,
      attachments: message.attachments,
      mentions: message.mentions,
      metadata: message.metadata,
      createdAt: message.createdAt,
      timestamp: new Date(),
    });
  }

  @OnEvent('collaboration.task.started')
  handleTaskStarted(payload: any) {
    const { taskId, roomId } = payload;

    this.server.to(roomId).emit('task-started', {
      taskId,
      roomId,
      timestamp: payload.timestamp,
    });

    this.server.to(`task-${taskId}`).emit('task-status-changed', {
      taskId,
      status: 'REQUIREMENT_ANALYSIS',
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('collaboration.requirement.analyzed')
  handleRequirementAnalyzed(payload: any) {
    const { taskId, stepId, agentId, analysisResult } = payload;

    this.server.to(`task-${taskId}`).emit('requirement-analyzed', {
      taskId,
      stepId,
      agentId,
      analysisResult,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('collaboration.task.completed')
  handleTaskCompleted(payload: any) {
    const { taskId, roomId, approvalRate } = payload;

    this.server.to(roomId).emit('task-completed', {
      taskId,
      roomId,
      approvalRate,
      timestamp: payload.timestamp,
    });

    this.server.to(`task-${taskId}`).emit('task-status-changed', {
      taskId,
      status: 'COMPLETED',
      approvalRate,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('collaboration.task.failed')
  handleTaskFailed(payload: any) {
    const { taskId, roomId, error } = payload;

    this.server.to(roomId).emit('task-failed', {
      taskId,
      roomId,
      error,
      timestamp: payload.timestamp,
    });

    this.server.to(`task-${taskId}`).emit('task-status-changed', {
      taskId,
      status: 'FAILED',
      error,
      timestamp: payload.timestamp,
    });
  }

  // 辅助方法

  /**
   * 向特定房间发送系统消息
   */
  sendSystemMessageToRoom(roomId: string, content: string, metadata?: any) {
    this.server.to(roomId).emit('system-message', {
      content,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * 向特定用户发送通知
   */
  sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', {
        ...notification,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 获取房间在线用户数
   */
  getRoomOnlineCount(roomId: string): number {
    return this.connectedUsers.get(roomId)?.size || 0;
  }

  /**
   * 获取所有在线用户
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
