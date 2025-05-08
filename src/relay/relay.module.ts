import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Relay } from '../entities/relay.entity';
import { RelayService } from './relay.service';
import { RelayController } from './relay.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Relay])],
  providers: [RelayService],
  controllers: [RelayController],
  exports: [RelayService],
})
export class RelayModule {}
