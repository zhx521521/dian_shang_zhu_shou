import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER } from './llm.provider';
import { MockLlmProvider } from './mock-llm.provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

@Global()
@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('LLM_API_KEY');
        return apiKey
          ? new OpenAiCompatibleProvider(
              config.get('LLM_BASE_URL', 'https://api.openai.com/v1'),
              apiKey,
              config.get('LLM_MODEL', 'gpt-5-mini'),
            )
          : new MockLlmProvider();
      },
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
