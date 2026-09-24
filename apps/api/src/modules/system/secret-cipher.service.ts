import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class SecretCipherService {
  constructor(private readonly config: ConfigService) {}
  encrypt(value: string): string {
    const key = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
  }
  decrypt(value: string): string {
    const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
  private key(): Buffer {
    const value = this.config.getOrThrow<string>('CONFIG_ENCRYPTION_KEY');
    if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('CONFIG_ENCRYPTION_KEY must be 64 hexadecimal characters');
    return Buffer.from(value, 'hex');
  }
}
