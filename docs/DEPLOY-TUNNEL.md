# 本机部署 + 穿透 URL 登录

应用使用 **JWT 放在 httpOnly Cookie** + **CORS `credentials`**。外网访问时，**`FRONTEND_URL` 必须与浏览器地址栏的 Origin 完全一致**（协议 + 主机 + 端口），否则无法登录。

生产形态：**构建后的前端**由 Express 在 **同一端口**提供（默认 `8080`），路径为 `/`、`/login`、`/api/...`，适合只穿透一个端口。

## 1. 安装依赖（仓库根目录）

```powershell
cd D:\Work_Area\AI\Progi-Projekt-Tim-3
npm install
npm run install:all
```

## 2. 数据库

沿用你已有的 PostgreSQL（库 `fertutor`、已导入 `baze.sql` 等）。Docker 方式见下文。

## 3. 配置 `app/server/.env`

至少包含：`DB_*`、`JWT_SECRET`、`VERIFY_SECRET`、`RESET_SECRET`。

穿透时不要写 `localhost`，应写 **公网 HTTPS 地址**（见第 4 步得到 URL 后再填）。

## 4. 一键：构建 + cloudflared + 自动设置 FRONTEND_URL

1. 安装 [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) 并确保在 `PATH` 中。
2. 执行：

```powershell
cd D:\Work_Area\AI\Progi-Projekt-Tim-3
npm run tunnel
```

脚本会：构建 `app/client` → 启动 quick tunnel → 从输出解析 `https://*.trycloudflare.com` → 以 `NODE_ENV=production`、`FRONTEND_URL=<该 URL>` 启动 `app/server`。

3. 用浏览器打开 cloudflared 打印的 **https** 地址，访问 `/login` 登录即可。

若 cloudflared 不可用，脚本会尝试读取 **ngrok** 本地 API（需先在另一终端运行 `ngrok http 8080`）。

### 手动方式（任意穿透工具）

1. 构建并启动单端口服务：

```powershell
cd D:\Work_Area\AI\Progi-Projekt-Tim-3
npm run start:prod
```

2. 将穿透工具指到 **本机 8080**（例如 `cloudflared tunnel --url http://localhost:8080` 或 `ngrok http 8080`）。

3. 将穿透给出的 **https URL** 写入 `app/server/.env` 的 **`FRONTEND_URL`**，保存后**重启** Node 进程。

4. 用该 **https URL** 访问 `/login`（不要再用 `http://localhost:8080` 登录，否则 Cookie 与 CORS 不一致）。

## 5. 开发模式（可选）

仍可同时使用 Vite 开发服务器：

- 前端：`http://localhost:5173`（代理 `/api` → `8080`）
- 后端：`app/server` 中 `npm run dev`

穿透开发端口时，将 `FRONTEND_URL` 设为穿透到 **5173** 的 URL。

## 6. Docker Compose（PostgreSQL + 应用）

```powershell
cd D:\Work_Area\AI\Progi-Projekt-Tim-3
copy deploy\docker.env.example deploy\docker.env
# 编辑 deploy\docker.env 中的密码与密钥
docker compose --env-file deploy\docker.env up --build -d
```

浏览器访问：`http://localhost:8080`（或你在 `FRONTEND_URL` 中配置的地址）。

首次启动 Postgres 空数据卷时会执行 `baze.sql` 与 `migration_admin.sql`。需要演示数据时，可再在库中执行 `testingData.sql`（见 `app/server/baze/testingData.sql`）。

穿透 Docker 暴露的 8080 时，同样把 `FRONTEND_URL` 改为穿透 URL 并 `docker compose up -d` 重启 `app`。

## 7. 安全提示

- 勿将默认 `JWT_SECRET`、数据库密码提交到公开仓库。
- 对外暴露前请修改所有默认密钥与数据库口令。
