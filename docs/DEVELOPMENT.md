# 绘梦岛 (HuiMengDao) 开发文档

## 项目概述

基于 Expo SDK 54 + TypeScript + expo-router 的移动端 App。

## 项目结构

```
HuiMengDao/
├── hui-meng-dao/          # 主应用 (Expo)
│   ├── app/                # 页面路由
│   │   ├── (tabs)/         # 底部 Tab 页面
│   │   │   ├── home/       # 首页
│   │   │   ├── projects/   # 企划页
│   │   │   ├── messages/   # 消息页
│   │   │   └── me/        # 我的页
│   │   ├── auth/           # 登录注册页
│   │   └── ...
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   └── TagBar.tsx  # 标签栏组件
│   │   ├── stores/         # 状态管理 (Zustand)
│   │   └── services/       # API 服务
│   └── server/             # Express 后端
│
├── hongshu/                # 参考：后端 SpringBoot
└── hongshu-ui/             # 参考：前端 Vue/Uniapp
```

## 环境配置

### API 配置
- 服务器 IP: `10.146.158.17`
- 端口: `4000`
- `.env` 文件: `EXPO_PUBLIC_API_BASE_URL=http://10.146.158.17:4000`

### 启动命令

```bash
# 后端
cd hui-meng-dao/server
npm run dev

# 前端 (Web)
cd hui-meng-dao
npm run start

# 前端 (手机)
npx expo start --tunnel
```

## 已完成

### 组件
- `TagBar.tsx` - 可复用的标签栏组件，支持：
  - 左侧标题
  - 右侧下拉箭头
  - 标签点击回调

### 页面
- 首页 (`app/(tabs)/home/index.tsx`) - 使用 TagBar 组件
- 企划页 (`app/(tabs)/projects/index.tsx`) - 使用 TagBar 组件

### Bug 修复
1. 引号问题：中文引号 → 英文引号
2. SecureStore 兼容性：改用 AsyncStorage（等 SDK 55 稳定后再改回）
3. mock 逻辑清理：只保留真实 API 调用
4. 服务器监听地址：`0.0.0.0` 允许外部访问
5. 顶部布局空白修复

## 待完成

1. 登录/注册功能（API 已通，需测试）
2. 首页轮播图数据加载
3. 首页瀑布流卡片
4. 企划页列表数据
5. 消息页
6. 我的页

## 技术栈

- 前端: Expo SDK 54 + React Native + TypeScript + Zustand
- 后端: Express + MySQL (远程数据库)
- 布局: 基准 402x874 设计稿

## 注意事项

1. 手机和服务器需在同一 WiFi 下，或者用 `--tunnel` 模式
2. `.env` 修改后需重新编译
3. mock 代码已清理，所有 API 走真实后端