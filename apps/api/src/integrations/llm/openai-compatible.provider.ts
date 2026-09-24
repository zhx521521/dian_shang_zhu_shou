import { CreativeContent, DiagnosisContent, LlmProvider } from './llm.provider';

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {
    this.name = model;
  }

  diagnoseProduct(input: unknown) {
    return this.request<DiagnosisContent>('输出严格 JSON 商品诊断，字段使用既定英文键。', input);
  }

  generateCreatives(input: unknown) {
    return this.request<CreativeContent>('输出严格 JSON，包含恰好 3 个 imagePlans 和 3 个 videoScripts。', input);
  }

  generateReportInsights(input: unknown) {
    return this.request<{ observations: string[]; limitations: string[]; actions: string[] }>(
      '仅依据输入做描述性分析。输出 JSON observations、limitations、actions，禁止声称因果。',
      input,
    );
  }

  private async request<T>(instruction: string, input: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          input: `${instruction}\n输入：${JSON.stringify(input)}`,
          text: { format: { type: 'json_object' } },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`LLM_HTTP_${response.status}`);
      const body = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
      const text = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;
      if (!text) throw new Error('LLM_EMPTY_RESPONSE');
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
