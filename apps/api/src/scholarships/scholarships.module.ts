import { Module } from '@nestjs/common';
import {
  ScholarshipProgramsController,
  TeacherAssignmentsController,
} from './scholarships.controller';
import { ScholarshipProgramsService, TeacherAssignmentsService } from './scholarships.service';

@Module({
  controllers: [ScholarshipProgramsController, TeacherAssignmentsController],
  providers: [ScholarshipProgramsService, TeacherAssignmentsService],
})
export class ScholarshipsModule {}
