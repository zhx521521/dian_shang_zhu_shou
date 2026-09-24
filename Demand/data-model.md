# 电商运营助手数据模型

## 1. 关系模型

```text
Shop 1--N Product 1--N Sku
Product 1--N Competitor / DiagnosisRun / CreativeProject / GenerationTask / Asset / Experiment / MetricRecord / Report
DiagnosisRun 1--N DiagnosisVersion
CreativeProject 1--N CreativeVersion 1--N GenerationTask 1--N GenerationAttempt
Asset 1--N AssetVersion / AssetReview
Experiment 1--N ExperimentVersion / ExperimentApproval / MetricRecord
Report 1--N ReportVersion
```

## 2. 状态枚举

```text
Product: draft, active, inactive, archived
Task: pending, running, cancelling, cancelled, succeeded, failed, timed_out
Asset: draft, pending_review, approved, rejected, archived
Experiment: draft, pending_approval, approved, rejected, closed
```

## 3. 统一审计字段

业务实体统一使用 `id`、`created_at`、`created_by`、`updated_at`、`updated_by`、`version`；可归档对象使用 `archived_at`。引用已审批或已报告对象的数据只允许逻辑归档。

## 4. 指标口径

```text
CTR = clicks / impressions
CVR = paid_orders / clicks
bounce_rate = bounced_visitors / visitors
ROI = gmv / ad_spend
```

分母为零返回空值，前端展示为 `--`。经营数据的业务唯一粒度为日期、店铺、平台商品，可选 SKU 和实验。
