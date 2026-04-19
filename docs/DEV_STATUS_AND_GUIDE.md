# hui-meng-dao 开发状态与联调文档

更新时间：2026-04-19

本文档用于快速回答四件事：
- 现在已经实现了哪些功能
- 还有哪些功能未实现/仅占位
- 哪些组件可以复用
- 当前数据库配置与连接方式

---

## 1. 当前已实现功能

### 1.1 登录与会话
- 登录页支持两种模式切换：
  - 验证码登录（本地模拟验证码与倒计时）
  - 密码登录（真实后端接口）
- 密码账号链路已实现：
  - 密码注册
  - 忘记密码（非短信版，手机号 + 新密码）
- 登录后写入本地会话：
  - token（SecureStore）
  - session / userProfile（AsyncStorage）
- 退出登录已实现：
  - 清理本地会话
  - 返回登录页

相关文件：
- `app/auth/index.tsx`
- `src/stores/sessionStore.ts`
- `src/services/authApi.ts`
- `server/src/routes/auth.ts`

### 1.2 Home（首页）
- 已接入数据加载链路（real/mock 可切换）
- 支持：
  - 加载中状态
  - 错误态 + 重试
  - 下拉刷新
- **私密过滤**：首页 Feed 帖子列表后端 `WHERE is_public = 1`，私密帖子不进入广场流
- 瀑布流数据由数据网关提供（真实接口或 mock 兜底）

相关文件：
- `app/(tabs)/home/index.tsx`
- `src/stores/homeStore.ts`
- `src/services/homeApi.ts`
- `src/services/dataGateway.ts`
- `server/src/routes/home.ts`

### 1.3 Messages（消息）
- 会话列表接入数据层（真实 API）
- 支持刷新会话列表
- 支持进入私信会话页
- 私信会话支持发送消息并更新会话最后一条消息
- **私信聊天页完善**：图片选择+上传按钮、KeyboardAvoidingView 键盘适配、发送按钮状态（disabled 样式）、新消息自动滚动到底部
- **消息中心完善**：快捷入口（赞和收藏、新增关注、回复和@）可点击导航到通知页；推荐用户列表增加「私信」按钮，点击创建/获取 DM thread 并跳转

相关文件：
- `app/(tabs)/messages/index.tsx`
- `app/dm/index.tsx`
- `app/dm/[threadId].tsx`
- `src/stores/messagesStore.ts`
- `src/services/messagesApi.ts`
- `server/src/routes/messages.ts`

### 1.4 Me（我的）
- 个人资料展示接入数据层
- 编辑资料弹窗（昵称、简介）可保存
- 设置按钮可进入设置页

相关文件：
- `app/(tabs)/me/index.tsx`
- `src/stores/meStore.ts`
- `src/services/meApi.ts`
- `server/src/routes/me.ts`

### 1.5 设置页与账号安全页
- 设置页已按分组卡片实现
- “退出登录”可用
- “账号与安全”页面已实现并分组：
  - 手机号、密码设置
  - 微信账号、QQ账号
  - 登录设备管理
  - 注销账号
- 账号安全子功能已实现：
  - 手机号修改（需密码确认）
  - 密码修改
  - 登录设备管理（简版）
  - 注销账号（需密码确认，完成后自动退出登录）
- 右侧箭头样式已抽离复用组件

相关文件：
- `app/settings/index.tsx`
- `app/settings/account-security.tsx`
- `app/settings/change-password.tsx`
- `app/settings/change-phone.tsx`
- `app/settings/login-devices.tsx`
- `app/settings/deactivate-account.tsx`
- `src/components/SettingChevron.tsx`

---

## 2. 当前未实现或仅占位功能

以下功能目前点击后为“敬请期待”或仅 UI 占位：

### 2.1 设置相关
- 账号认证
- 通用设置
- 通知设置
- 隐私设置
- 清理缓存
- 收货地址
- 约稿指南
- 建议反馈
- 处罚与纠纷指南
- 帮助与客服
- 切换账号
- 账号安全页中的：
  - 微信绑定/解绑
  - QQ 绑定/解绑
  - 登录设备下线管理（当前仅列表展示）

### 2.2 登录相关
- 验证码真实下发（当前为本地模拟）
- 验证码注册/重置流程（当前仅密码注册与密码重置）

### 2.3 业务完善
- 部分历史模块仍处于 mock 阶段（项目/角色/运营后台等旧规划内容）
- 全仓 TypeScript 历史报错尚未完全清理（非本轮新增）

---

## 3. 可复用组件与模式

### 3.1 组件
- `src/components/SettingChevron.tsx`
  - 设置类页面统一右箭头组件
  - 用法：直接在右侧区域渲染 `<SettingChevron />`

- `src/components/WaterfallCard.tsx`
  - 首页/我的瀑布流卡片复用

- `src/components/toast.tsx`
  - 轻量提示统一使用

### 3.2 状态与数据层复用模式
- 页面尽量不直接请求接口，统一通过 store 调用 service
- real/mock 切换统一走 `src/services/dataGateway.ts`
  - `EXPO_PUBLIC_USE_REAL_API=1` 时走真实后端
  - 否则走 mock 兜底

---

## 4. 后端与数据库配置

本项目当前后端目录：
- `server/`

已实现的账号相关后端接口：
- `POST /api/auth/register-password`
- `POST /api/auth/login-password`
- `POST /api/auth/forgot-password`
- `PATCH /api/me/change-password`
- `PATCH /api/me/change-phone`
- `GET /api/me/devices`
- `POST /api/me/deactivate`

核心环境变量：
- `PORT=4000`
- `DB_HOST=146.56.251.112`
- `DB_PORT=3306`
- `DB_NAME=HuiMeng`
- `DB_USER=remote_user`
- `DB_PASSWORD=Hjx200554`

连接串（MySQL）：
- `mysql://remote_user:Hjx200554@146.56.251.112:3306/HuiMeng`

前端联调环境变量：
- `EXPO_PUBLIC_USE_REAL_API=1`
- `EXPO_PUBLIC_API_BASE_URL=http://<本机局域网IP>:4000`

---

## 5. 启动与联调

### 5.1 启动后端
在 `server` 目录执行：

```powershell
npm install
npm run dev
```

### 5.2 启动前端（Expo）
在项目根目录执行：

```powershell
npm install
$env:EXPO_PUBLIC_USE_REAL_API="1"
$env:EXPO_PUBLIC_API_BASE_URL="http://你的局域网IP:4000"
npx expo start -c
```

### 5.3 真机调试要点
- 手机和电脑必须同一局域网
- `EXPO_PUBLIC_API_BASE_URL` 不能写 `localhost`（手机上 `localhost` 指向手机自己）
- 可先浏览器访问 `http://你的局域网IP:4000/health` 检查后端可达

---

## 6. 数据库账号测试数据

已创建测试账号（用于密码登录）：
- 昵称：`测试林洛`
- 手机号：`18052710393`
- 密码：`123456`
- uid：`0000001`

说明：
- uid 规则为 7 位纯数字，按序递增（从 `0000001` 开始）
- 登录密码当前按 `SHA2(..., 256)` 存储（后续可升级 bcrypt/argon2）
