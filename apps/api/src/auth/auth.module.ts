import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AbilityFactory } from './ability.factory';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AbilityFactory],
  // JwtModule burada re-export ediliyor cunku JwtAuthGuard global bir APP_GUARD
  // olarak AppModule'de kayitli - JwtService'in oradan da erisilebilir olmasi gerekiyor.
  exports: [AbilityFactory, JwtModule],
})
export class AuthModule {}
