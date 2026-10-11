<div align="center">

# STORE // 卡密商城

**数字商品自动/人工发货的轻量商城**<br>
*Small, self-hosted storefront for digital delivery.*

[![Go](https://img.shields.io/badge/Go-1.23%2B-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111111)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
![License](https://img.shields.io/badge/License-See%20repository-555555?style=for-the-badge)

</div>

---

## 01. THE PURPOSE // 项目本源

Store 聚焦数字卡密销售：买家下单、支付回调、自动分配库存或管理员人工发货，再由买家查询订单。

[Repository](https://github.com/kerntau/store)

## 02. CORE ARCHITECTURE // 核心架构

~~~mermaid
graph LR
  B[Buyer Web] --> API[Go API]
  A[Admin Web] --> API
  API --> PG[(PostgreSQL)]
  API --> R[(Redis)]
  API --> INV[Card inventory]
  PAY[Payment callback] --> API
  API --> D[Auto or manual delivery]
~~~

web/ 是 React 买家端与管理端；api/ 提供订单、商品、库存和回调接口；deploy/ 保存数据库与容器编排。

## 03. TECHNICAL MATRIX // 技术矩阵

| 领域 | 技术 | 说明 |
| --- | --- | --- |
| API | Go | 订单、支付、库存与查询 |
| 数据 | PostgreSQL + Redis | 持久化与缓存/队列 |
| 前端 | React、Vite、TypeScript | 买家和管理员界面 |
| UI | Material UI | 表单、表格和管理控件 |
| 交付 | Docker Compose | 本地与服务器编排 |

## 04. REPOSITORY TOPOLOGY // 源码拓扑

~~~text
api/                 # Go 后端
web/                 # React 前台和管理后台
deploy/.env.example  # 环境变量示例
deploy/schema.sql    # 数据库结构
deploy/docker-compose.yml
docs/STRUCTURE.md    # 目录与运维说明
~~~

## 05. CLONE & QUICK START // 极速开始

需要 Node.js、Go 和 Docker。

~~~bash
git clone https://github.com/kerntau/store.git
cd store
cd deploy
docker compose up -d --build
~~~

默认访问 http://127.0.0.1:8080。首次启动前审阅 deploy/.env.example 并修改数据库、Redis、支付回调和管理员凭据。

## 06. DEPLOYMENT & VERIFICATION // 部署与验证

生产环境通过 HTTPS 暴露管理端和支付回调；使用独立密钥管理保存数据库、Redis 和管理员密钥。运行数据库迁移后，再验证下单、支付回调、自动发货、人工发货和订单查询。

提交前检查 API 与前端构建，并确认 deploy/schema.sql 与当前服务版本匹配。

## 07. ENGINEERING CONTRACT // 工程契约

- 订单状态变化必须可追踪且具备幂等处理。
- 支付回调不可直接信任客户端字段。
- 卡密库存、管理员凭据和生产环境变量不得提交。
- 数据库结构改动需同步迁移和回滚说明。

## 08. ROADMAP // 演进路线

- [x] 自动发货与人工发货核心流程
- [x] Go API、React 管理端和 Docker 编排
- [ ] 更完整的支付渠道适配层
- [ ] 订单与库存的审计导出

## 09. LICENSE // 许可证

仓库当前未附 LICENSE 文件，分发前请补充许可证并同步更新本节。
