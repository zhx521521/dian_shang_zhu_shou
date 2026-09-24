import { Module } from '@nestjs/common';
import { SecretCipherService } from './secret-cipher.service';
import { SystemController } from './system.controller';
@Module({ controllers: [SystemController], providers: [SecretCipherService] })
export class SystemModule {}
