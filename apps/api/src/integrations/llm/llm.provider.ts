export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface DiagnosisContent {
  targetAudience: string[];
  priceBandAnalysis: string;
  sellingPointMatrix: Array<{ point: string; evidence: string }>;
  competitorDifferences: string[];
  conversionBarriers: string[];
  risks: string[];
  optimizationDirections: string[];
}

export interface CreativeContent {
  imagePlans: Array<{
    name: string;
    targetAudience: string;
    composition: string;
    copy: string;
    sellingPoint: string;
    color: string;
    visualElements: string[];
  }>;
  videoScripts: Array<{
    name: string;
    durationSeconds: number;
    openingHook: string;
    shots: Array<{ sequence: number; durationSeconds: number; visual: string; voiceover: string; subtitle: string }>;
    callToAction: string;
  }>;
}

export interface LlmProvider {
  readonly name: string;
  diagnoseProduct(input: unknown): Promise<DiagnosisContent>;
  generateCreatives(input: unknown): Promise<CreativeContent>;
  generateReportInsights(input: unknown): Promise<{ observations: string[]; limitations: string[]; actions: string[] }>;
}
