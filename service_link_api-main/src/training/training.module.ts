import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { TrainingModule as TrainingModuleEntity } from './entities/training-module.entity';
import { TrainingTopic } from './entities/training-topic.entity';
import { TrainingQuestion } from './entities/training-question.entity';
import { TrainingProgress } from './entities/training-progress.entity';
import { TrainingQuizAttempt } from './entities/training-quiz-attempt.entity';
import { TrainingAssignment } from './entities/training-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingModuleEntity,
      TrainingTopic,
      TrainingQuestion,
      TrainingProgress,
      TrainingQuizAttempt,
      TrainingAssignment,
      User,
    ]),
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule implements OnModuleInit {
  constructor(private readonly trainingService: TrainingService) {}

  async onModuleInit() {
    try {
      await this.trainingService.seedFromJsonIfEmpty();
    } catch (e) {
      // schema may not exist yet
    }
  }
}
