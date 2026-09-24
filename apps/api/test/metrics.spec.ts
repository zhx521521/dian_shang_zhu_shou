import { describe, expect, it } from 'vitest';
import { calculateMetrics } from '../src/modules/metrics/metrics.service';
describe('calculateMetrics', () => {
  it('calculates all ratios from source values', () => expect(calculateMetrics({ impressions: 1000, clicks: 100, visitors: 80, bouncedVisitors: 20, paidOrders: 10, unitsSold: 12, gmv: 2000, adSpend: 500 })).toEqual({ ctr: 0.1, cvr: 0.1, bounceRate: 0.25, roi: 4 }));
  it('returns null for zero denominators', () => expect(calculateMetrics({ impressions: 0, clicks: 0, visitors: 0, bouncedVisitors: 0, paidOrders: 0, unitsSold: 0, gmv: 0, adSpend: 0 })).toEqual({ ctr: null, cvr: null, bounceRate: null, roi: null }));
});
