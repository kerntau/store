# Store

面向数字商品的轻量卡密商城，支持自动发货与人工发货两种订单流程。

## 核心流程

1. 买家选择商品并创建订单。
2. 支付回调将订单标记为已支付。
3. 自动发货商品从卡密库存分配内容并展示给买家。
4. 人工发货商品等待管理员填写发货内容。
5. 买家使用订单号与邮箱（或查询密码）查询订单。

## 技术栈

- API：Go、PostgreSQL、Redis
- Web 与管理后台：React、Vite、TypeScript、Material UI
- 部署：Docker Compose

## 目录

- api/：Go API 服务
- web/：买家端和管理后台
- deploy/：数据库迁移、环境变量示例和 Docker Compose
- docs/：结构与运维说明

详细目录说明见 docs/STRUCTURE.md。

## 本地运行

需要 Node.js、Go 和 Docker。

~~~bash
cd deploy
docker compose up -d --build
~~~

默认访问地址为 http://127.0.0.1:8080。首次启动前请检查 deploy/.env.example，修改数据库、Redis、支付回调和管理员凭据等配置。

数据库结构位于 deploy/schema.sql。不要把生产环境密钥提交到仓库。

## 安全提示

示例配置中的管理员账号仅用于本地开发。部署到公网前，请替换默认密码、设置随机 JWT/会话密钥，并通过 HTTPS 保护管理端和支付回调。

## 许可证

以仓库中的许可证文件为准。
