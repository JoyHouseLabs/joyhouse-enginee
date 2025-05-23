import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MeditationController } from './meditation.controller'
import { MeditationService } from './meditation.service'
import { Meditation } from './meditation.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Meditation])],
  controllers: [MeditationController],
  providers: [MeditationService],
  exports: [MeditationService]
})
export class MeditationModule {} 