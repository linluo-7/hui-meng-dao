# 绘梦岛（HuiMengDao / DreamIsle）

基于 **Expo SDK ~54 + TypeScript + expo-router** 的移动端 App 工程。当前已完成 **M1：Splash → Onboarding → Auth → Tabs** 的登录态闭环与页面骨架（离线可跑）。

## 产品与规格文档（请以此为准）

- `docs/PRD_V5_Base.md`：PDR V5.0 固化后的**需求规格基线**（功能/规则/权限/约束/验收）
- `docs/API_Fields_V5.md`：按模块拆好的**接口与字段清单**（给开发/联调/测试使用）

## 里程碑

- **M1（已完成）**：启动检查、引导页、手机号登录/注册（本地验证码）、主 Tabs（广场/企划/消息/我的）
- **M2（计划）**：首页/企划广场/企划详情（完善 mock 数据跑通）
- **M3（计划）**：角色 + 聊天 + 私信
- **M4（计划）**：作品 + 通知 + 设置
- **M5（计划）**：mockApi → 真实后端 API 的改造点清单

详细请看：`docs/M1.md`

## 快速启动

> 建议 Node.js **20.19.4+**（当前环境若低于此版本可能出现 `EBADENGINE` 警告，但一般可运行）

### Windows（Android 真机 / Expo Go）

```powershell
Set-Location C:\Users\Administrator\Desktop\HuiMeng\hui-meng-dao
npm install
npx expo start -c
```

- 打开 **Expo Go** 扫码进入。
- 若同网段/防火墙导致手机连不上，使用：

```powershell
npx expo start --tunnel
```

## 新增后端服务（Home / Messages / Me）

1. 在 `server/.env` 配置数据库连接（可参考 `server/.env.example`）。
2. 安装依赖并启动 API：

```powershell
Set-Location C:\Users\Administrator\Desktop\HuiMeng\hui-meng-dao\server
npm install
npm run dev
```

3. 回到前端目录启动 App（连接真实 API）：

```powershell
Set-Location C:\Users\Administrator\Desktop\HuiMeng\hui-meng-dao
$env:EXPO_PUBLIC_USE_REAL_API="1"
$env:EXPO_PUBLIC_API_BASE_URL="http://<你的本机IP>:4000"
npm run start
```

后端默认提供：
- `GET /health`
- `POST /api/auth/mock-login`
- `GET /api/home/feed`
- `GET /api/messages/threads`
- `GET /api/messages/threads/:id`
- `POST /api/messages/threads/:id/messages`
- `GET /api/me/profile`
- `PATCH /api/me/profile`

### macOS（iOS）

```bash
cd /path/to/hui-meng-dao
npm install
npx expo start -c
```

然后用 iPhone Expo Go 扫码，或在 DevTools 里运行 iOS 模拟器（需要 macOS）。

## 常见问题（简版）

- **扫码后停在 Welcome / Connecting**：确认手机与电脑同一 Wi-Fi、关闭 VPN/代理、允许防火墙放行；必要时用 `--tunnel`。
- **依赖/打包异常**：先 `npx expo start -c` 清缓存；仍不行时删除 `node_modules` 与 `package-lock.json` 后重装。

