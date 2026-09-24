# 电商运营助手

面向内部试运行的单品运营工作台。工程采用 npm workspaces，包含 React Web、NestJS API、BullMQ Worker、Prisma 数据层及共享契约。

## 本地启动

1. 将 `.env.example` 复制为 `.env`，替换生产环境安全密钥。
2. 执行 `npm.cmd install`。
3. 只查看前端时，先启动 `npm.cmd run dev:api`，再启动 `npm.cmd run dev:web`。开发环境默认开启 `DEMO_MODE=true`，没有 PostgreSQL 时也可以使用演示账号进入工作台。
4. 需要真实数据库时，执行 `npm.cmd run db:generate` 和 `npm.cmd run db:migrate`，再启动 `npm.cmd run dev:worker`。


基础设施也可通过 `docker compose up postgres redis minio -d` 启动。完整容器化启动使用 `docker compose up --build`。

- Web: http://localhost:5173
- API: http://localhost:3000/api
- OpenAPI: http://localhost:3000/docs
- MinIO Console: http://localhost:9001

演示账号：`operator`、`supervisor`、`admin`，统一密码为 `Demo@123456`。演示降级只允许在非生产环境使用；生产环境必须提供 PostgreSQL、Redis 和有效的 `JWT_SECRET`。

架构和领域模型见 [Demand/architecture.md](Demand/architecture.md) 与 [Demand/data-model.md](Demand/data-model.md)。
