---
name: frontend-design-system
description: Standardize and implement UI from design drafts in this Expo Router + React Native app. Use when the user asks to “按设计稿对齐/还原页面/完善前端设计/调整间距颜色”, or when implementing Home/Projects/Market screens. Includes scaling rules (402x874), spacing system (6px), color tokens, and reusable UI patterns/components in this repo.
---

# Frontend Design System（绘梦岛）

> 适用于“按 Figma 精确还原”的高约束场景，尤其是个人页这类大量绝对坐标模块。

## Quick start（做页面还原时默认按这个流程）

1. **确认设计稿基准**：本项目已固定为 **402 × 874**（见 `src/utils/uiScale.ts`）。
2. **先定坐标体系（必须先问清）**：
   - Tabs 顶部灰色占位来自 `app/(tabs)/_layout.tsx` 的 `topSpacer`（当前为 61）。
   - 必须先和用户确认：设计稿的 `top` 是否**已包含顶部 61**。
   - 若“包含 61 且页面内容区从 header 下方开始”，统一换算：`topInContent = top - topSpacerHeight`。
   - 若页面自己绘制了顶部 61（不依赖 Tabs header 占位），则直接用 `top`，不做减法。
3. **把布局值收敛为常量**：在页面文件顶部建立 `const`（例如 `PAGE_SIDE_PADDING`、`CONTENT_WIDTH`、`CARD_GUTTER`），避免散落魔数。
4. **做模块对齐**：先对齐 `left/top/width/height/radius`（模块级），再微调内部文字/图标。
5. **立即跑一遍 lints**：改动后检查该文件是否新增问题（保持改动可控）。
6. **用户要求“先别改代码”时**：先只做换算校验与口径确认，不落地改动。

## Figma 标注口径（新增，优先级高）

默认口径（若用户未特别说明）：

- Figma Frame：`402 x 874`（整屏坐标系）。
- `top/left/width/height/radius` 均来自整屏标注。
- 本项目 Tabs 结构下，页面内容区坐标通常从 `topSpacer` 下方开始。

坐标换算模板：

```ts
const TOP_SPACER = 61; // from tabs header
const FOO_TOP = 345; // from figma screen top
const FOO_TOP_IN_CONTENT = FOO_TOP - TOP_SPACER;

top: verticalScale(FOO_TOP_IN_CONTENT);
left: scale(FOO_LEFT);
width: scale(FOO_W);
height: verticalScale(FOO_H);
```

## 绝对定位 vs 流式布局（新增）

选择规则：

- **有明确 `top/left/width/height` 标注的模块容器**：优先绝对定位（确保 1:1）。
- **模块内部元素**（如 tag 组内多个胶囊、按钮内文字）：优先流式（`row/gap`）保持健壮。
- 推荐“外绝内流”：外层按设计稿坐标固定，内层用 flex 保持可维护。

统一性要求：

- 同一视觉行（如“tag + 编辑资料 + 设置”）若都给了整屏坐标，建议抽成同一父容器并统一坐标系，避免混乱。

## Scaling / 换算规则（402×874）

- **横向相关**（`left/right/x/width/fontSize` 等）：用 `scale(designPx)`。
- **纵向相关**（`top/bottom/y/height` 等）：默认用 `verticalScale(designPx)`。
- **例外（视觉一致优先）**：对于**圆点、胶囊、图标**等“需要保持圆/不被拉扁”的元素，优先用 `scale()` 同时控制宽高。

补充：

- 中文按钮文字易裁切时，允许使用 `numberOfLines={1}`、`adjustsFontSizeToFit`、`minimumFontScale`、`includeFontPadding: false` 做兜底，不要破坏外层坐标。

## Spacing System（间距规则）

默认采用 **6px 间距体系**（设计稿 px）：

- **卡片瀑布流**：
  - 列间距：`6`
  - 同列上下间距：`6`
  - 分割线/模块与第一行卡片间距：`6`
- **页面左右边距**：按设计稿；常见值：
  - `8`（content 402-8*2=386）
  - `9`（content 402-9*2=384）

实现建议（示例）：

```ts
const GRID_GUTTER = 6;
const GRID_V_GAP = 6;
const PAGE_SIDE_PADDING = 8; // or 9
```

## Color Tokens（常用颜色）

在页面实现时优先复用这些色值（与现有页面保持一致）：

- **基础**
  - `#FFFFFF`：页面白底
  - `#D9D9D9`：浅灰占位块/标题区
  - `#4C4C4C`：深灰内容区（瀑布流卡片的媒体/内容区）
  - `#838383`：非激活文字/次要文案
  - `#DEDEDE`：分割线（1px）
- **状态/标签**
  - `#FF0000`：红色标签（如“招募/进行中”）与轮播 active dot
  - `#00DDFF`：蓝色标签（如“不招募/已结束”）
  - `#F5B700`：黄色标签（如“企划”）

## Reusable assets / 复用资源（本仓库已有）

顶部右侧按钮（与首页一致）：

- **搜索图标**：`assets/images/home-search.png`
- **创建按钮（叠加两张图）**：
  - 底图红圆：`assets/images/home-dot.png`
  - 上层白加号：`assets/images/home-dot-plus.png`
- **tag 栏下拉箭头**：`assets/images/home-tag-arrow.png`
- **爱心**：`assets/images/home-heart.png`（用于卡片标题区左下角的爱心图标）

## Reusable components / 可复用组件（本仓库已有）

- `src/components/toast`：轻量提示
- `src/components/Carousel.tsx`：可复用轮播（若设计稿需要固定宽高，外层容器负责裁剪/圆角）
- `src/components/SearchBar`：通用搜索条（如需 1:1 还原设计稿，允许在页面内做“定制版搜索条”）
- `src/components/WaterfallCard.tsx`：首页/个人页可复用瀑布流卡片（帖子/人设卡/企划三态，右上角 badge 区分）
  - 输入：`type`、`title`、`likeCount`、`width`、`coverAspectRatio`、`maxCoverHeight`
  - 行为：卡片宽度固定；封面高度按比例随宽缩放，并受最大高度约束
  - 结构：深色封面区 + 浅灰内容区 + 标题 + 爱心点赞 + 右侧头像位（小圆点）

## UI Patterns（推荐直接复用的写法）

### 1) Tabs 顶部灰色占位 + 页面白底

- Tabs 的 `header` 输出 `topSpacer`（灰底）
- 各页面 `SafeAreaView` 主体保持 `#FFFFFF`
- 页面 content 一般 `paddingTop: 0`，避免与 header spacer 叠加造成整体下移

### 2) 轮播模块（常见：圆角 + dots）

- 外层：`borderRadius` + `overflow: 'hidden'`
- dots：用 `scale()` 控制 dot 的宽高，保持圆形与胶囊不变形

### 3) 2 列瀑布流（先骨架，后接数据）

- 宽度：`(screenW - padding*2 - gutter) / 2`
- 间距：左右/上下均为 `6`
- 优先复用 `WaterfallCard` 组件，页面层只负责分列和传 `width`
- 封面高度优先用比例驱动（`coverAspectRatio`），并设置 `maxCoverHeight` 防止超长卡片

### 4) 设计稿精确行（按钮框 + 文字框）

当设计稿同时给了按钮框与文字框坐标时：

- 先锁定按钮框（例如 `120x34 @ top/left`）。
- 再把文字框换算为按钮内偏移（`textOffsetX = textLeft - btnLeft`，`textOffsetY = textTop - btnTop`）。
- 通过按钮内 `paddingLeft/paddingTop` 或文字绝对定位实现，保证文字命中设计稿。

### 5) 主 tab 精确定位（个人页）

- 若用户给了每个 tab 的独立 `left/width/top/height`，不要继续用等分流式。
- 用配置数组（`[{key,left,width}]`）驱动渲染，便于后续逐项微调。

## Output expectations（产物要求）

- **所有模块尺寸来自常量**（能一眼看出设计稿标注如何落地）
- **避免散落魔数**（尤其是 `top/left/width/height`）
- **对齐优先级**：模块位置/尺寸 → 圆角 → icon 尺寸 → 文案样式
- **先确认再修改**：遇到“坐标系口径不一致”或用户说“先别改代码”，先输出换算结论，再动代码。
- **每次改动后读 lints**：保持单文件改动干净，避免重复 style key 等低级错误。

