# 电商运营助手系统架构

## 1. 架构决策

一期采用“模块化单体 API + 独立异步 Worker”：API 负责同步业务、事务和权限，Worker 负责图片/视频任务。该组合满足内部试运行的交付速度、事务一致性和任务隔离要求，后续可将模块拆为服务而不改变领域接口。

```text
React Web -> NestJS API -> PostgreSQL
                         -> Redis/BullMQ -> Worker -> Media Provider
                         -> MinIO/Object Storage
```

文本模型、图片服务、视频服务和文件存储均通过 Provider 接口接入；没有真实媒体密钥时使用 Mock Provider 完成成功、失败、超时和取消验收。

## 2. 代码分层

- `common`：请求 ID、统一错误、认证守卫、权限守卫、日志和校验。
- `modules`：按业务领域组织 Controller、Service、DTO 和数据访问。
- `integrations`：第三方 AI 和对象存储适配器，不允许领域模块直接依赖具体厂商 SDK。
- `workers`：任务执行、超时扫描和重试收敛。
- `packages/contracts`：状态枚举、API 公共类型和队列名称。
- `packages/database`：Prisma Schema、迁移和演示种子。

## 3. 数据流

1. 用户登录后获得短期 JWT，令牌携带角色及授权店铺 ID。
2. API 全局 JWT Guard 验证身份，Roles Guard 验证角色，领域服务验证店铺归属。
3. 商品、诊断、创意、审批和指标写操作进入 PostgreSQL，并保留版本/审计信息。
4. 媒体任务在数据库创建逻辑任务后写入 Redis 队列；Worker 创建执行尝试并更新状态。
5. 成功媒体写入对象存储，Asset 与 AssetVersion 写入数据库；失败、超时和取消均保留错误及尝试记录。
6. 报告读取基础指标并统一计算比例，再生成描述性观察、限制说明和行动项。

## 4. 运行与安全

本地/内部试运行通过 Docker Compose 启动 PostgreSQL、Redis、MinIO、API、Worker 和 Web。密钥通过环境变量注入，服务配置中的 API Key 通过 AES-GCM 加密后存储，页面只展示掩码。所有关键状态变更写入审计日志。

## 5. 可观测性

每个 HTTP 请求具有 `x-request-id`；Worker 日志关联任务 ID 和执行尝试 ID。`GET /api/health` 检查 API 与数据库可用性。后续可接入 Prometheus/OpenTelemetry，不改变业务模块接口。
