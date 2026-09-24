# ADR-002：通过 Provider 接入 AI 与存储服务

## 状态

已接受

## 背景

文本模型需要真实接入，图片和视频在无密钥环境下必须可模拟；不同厂商的请求格式、超时和错误码不同。

## 决策

业务模块只依赖 `LlmProvider`、`MediaProvider` 和 `StorageProvider` 接口。默认使用 OpenAI-compatible 文本 Provider、Mock 图片/视频 Provider 和 MinIO 存储 Provider。

## 结果

本地可离线完成端到端验收，真实服务替换不影响领域模块；Provider 统一处理超时、错误、重试、Schema 校验和敏感信息脱敏。
