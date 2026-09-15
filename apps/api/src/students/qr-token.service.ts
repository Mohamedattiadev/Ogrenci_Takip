import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface QrPayload {
  sid: string; // studentId
}

/**
 * Ogrenci karti/rozeti uzerine basilacak QR kodun icerigi. Ayri bir secret
 * kullanir (QR_TOKEN_SECRET) ki erisim jetonlariyla karismasin ve kart
 * uretimi/degistirilmesi login altyapisini etkilemesin.
 */
@Injectable()
export class QrTokenService {
  constructor(private readonly jwt: JwtService) {}

  generate(studentId: string): string {
    return this.jwt.sign({ sid: studentId } satisfies QrPayload, {
      secret: process.env.QR_TOKEN_SECRET ?? process.env.JWT_ACCESS_SECRET,
    });
  }

  decode(token: string): string {
    try {
      const payload = this.jwt.verify<QrPayload>(token, {
        secret: process.env.QR_TOKEN_SECRET ?? process.env.JWT_ACCESS_SECRET,
      });
      return payload.sid;
    } catch {
      throw new UnauthorizedException('Gecersiz QR kod');
    }
  }
}
