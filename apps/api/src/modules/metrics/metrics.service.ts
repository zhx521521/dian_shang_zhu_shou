import { CalculatedMetrics, MetricInput } from '@eoa/contracts';
export function calculateMetrics(input: MetricInput): CalculatedMetrics {
  return { ctr: input.impressions ? input.clicks / input.impressions : null, cvr: input.clicks ? input.paidOrders / input.clicks : null, bounceRate: input.visitors ? input.bouncedVisitors / input.visitors : null, roi: input.adSpend ? input.gmv / input.adSpend : null };
}
