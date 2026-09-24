import { CreativeContent, DiagnosisContent, LlmProvider } from './llm.provider';

export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock-llm';
  async diagnoseProduct(): Promise<DiagnosisContent> {
    return {
      targetAudience: ['注重功能与性价比的城市消费者'],
      priceBandAnalysis: '当前商品位于中端价格带，需通过功能证据支撑溢价。',
      sellingPointMatrix: [
        { point: '核心功能清晰', evidence: '商品参数与竞品输入快照' },
        { point: '使用场景明确', evidence: '目标客群与使用情境匹配' },
      ],
      competitorDifferences: ['建议突出可验证参数，避免只做价格对比'],
      conversionBarriers: ['核心卖点缺少可视化证据', '详情信息层级需要精简'],
      risks: ['AI 生成内容需要人工核验', '宣传用语需要合规复核'],
      optimizationDirections: ['补充参数依据', '制作场景化素材', '设置小预算对照实验'],
    };
  }

  async generateCreatives(): Promise<CreativeContent> {
    return {
      imagePlans: Array.from({ length: 3 }, (_, index) => ({
        name: `主图方向 ${index + 1}`,
        targetAudience: '目标消费人群',
        composition: index === 0 ? '产品主体居中，功能信息分层' : '场景对比构图，突出使用结果',
        copy: `核心卖点表达 ${index + 1}`,
        sellingPoint: '可验证的商品优势',
        color: ['清爽白绿', '高对比黑白', '品牌主色'][index],
        visualElements: ['商品主体', '参数标识', '适用场景'],
      })),
      videoScripts: Array.from({ length: 3 }, (_, index) => ({
        name: `短视频脚本 ${index + 1}`,
        durationSeconds: 20,
        openingHook: '3 秒内展示用户痛点和商品解决方案',
        shots: [
          { sequence: 1, durationSeconds: 3, visual: '痛点场景', voiceover: '还在为这个问题困扰？', subtitle: '真实痛点', },
          { sequence: 2, durationSeconds: 10, visual: '产品功能演示', voiceover: '核心功能逐项展示。', subtitle: '核心卖点', },
          { sequence: 3, durationSeconds: 7, visual: '使用结果和商品特写', voiceover: '根据实际需求选择适合的规格。', subtitle: '理性选购', },
        ],
        callToAction: '查看详情并选择适合的规格',
      })),
    };
  }

  async generateReportInsights() {
    return {
      observations: ['报告仅描述录入数据中的趋势和差异，不代表因果关系。'],
      limitations: ['缺少外部平台人群和归因链路数据。'],
      actions: ['针对主要差异设计下一轮单变量实验。'],
    };
  }
}
