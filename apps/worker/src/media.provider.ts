export interface GeneratedMedia {
  bytes: Buffer;
  extension: string;
  mimeType: string;
  metadata: Record<string, unknown>;
}

export interface MediaProvider {
  readonly name: string;
  generate(type: 'image' | 'video', payload: Record<string, unknown>): Promise<GeneratedMedia>;
}

export class MockMediaProvider implements MediaProvider {
  readonly name = 'mock-media';
  async generate(type: 'image' | 'video', payload: Record<string, unknown>): Promise<GeneratedMedia> {
    const scenario = payload.scenario ?? 'success';
    if (scenario === 'failed') throw new Error('MOCK_PROVIDER_FAILURE');
    if (scenario === 'timed_out') throw new Error('MOCK_PROVIDER_TIMEOUT');
    await new Promise((resolve) => setTimeout(resolve, 350));
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const videoPlaceholder = Buffer.from(JSON.stringify({ mock: true, type: 'video', payload }));
    return type === 'image'
      ? { bytes: png, extension: 'png', mimeType: 'image/png', metadata: { width: 1, height: 1, mock: true } }
      : { bytes: videoPlaceholder, extension: 'mock.json', mimeType: 'application/json', metadata: { mock: true, intendedMimeType: 'video/mp4' } };
  }
}
