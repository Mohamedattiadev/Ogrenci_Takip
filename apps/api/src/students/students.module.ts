import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { QrTokenService } from './qr-token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [StudentsController],
  providers: [StudentsService, QrTokenService],
  exports: [QrTokenService],
})
export class StudentsModule {}
