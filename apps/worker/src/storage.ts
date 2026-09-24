import { Client } from 'minio';

export class ObjectStorage {
  private readonly client: Client;
  private readonly bucket = process.env.MINIO_BUCKET ?? 'eoa-assets';
  constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'eoa-minio',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'replace-minio-password',
    });
  }
  async put(key: string, media: { bytes: Buffer; mimeType: string }) {
    if (!(await this.client.bucketExists(this.bucket))) await this.client.makeBucket(this.bucket);
    await this.client.putObject(this.bucket, key, media.bytes, media.bytes.length, { 'Content-Type': media.mimeType });
    return key;
  }
}
