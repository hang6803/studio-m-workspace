# 小M canvas spike：结论（2026-11-18）

**一句话：** canvas 版小M 外观、透视和四个常驻动画（x5bob 浮动、x5lid / x5lidside 眨眼、x5look 转头）以及 `.listen` / `.think` 都能对上；WebKit 下 WindowServer 从 **~91–96%** 降到 **~30–40%**，和页面上根本没有小M 是同一水平。值得接进正式版，但只先换「常驻的那一只」（PIN 页、`#mSvg` 按钮、头像），节日/生日场景保持 CSS-3D。

## 1. WindowServer CPU（%）

方法：`top -l 4 -s 2 -stats command,cpu -o cpu`，取第 2–4 个样本的 WindowServer 平均（第 1 个样本不是真读数）。页面 `index.html?ui=0&show=…&size=…`，窗口开在前台，每项 7–10 s 稳定后再测。两种宿主：Safari，和与 Tauri Mac App 同引擎的最小 WKWebView 窗口（640×420）。

| 页面内容 | WKWebView（同 Mac App） | Safari（r1, r2） |
|---|---|---|
| 没有 Safari / 宿主（基线） | — | 31.6、~~93.9~~ |
| 空页（不放小M） | 42.5、4.2、3.9、22.5（波动大） | 34.8、41.3 |
| **CSS-3D 小M 112（PIN 页）** | **91.0、88.8、92.5、93.3 → 平均 91** | **97.8、91.0 → 94** |
| **canvas 小M 112** | **29.2、25.6、34.0 → 平均 30**（另有 ~~71.1~~） | **40.0**（另有 ~~92.2~~） |
| CSS-3D 小M 229（场景卡） | 92.0、93.4（另有 ~~42.2~~） | 93.1、93.4 |
| canvas 小M 229 | 38.9、29.8（另有 ~~92.1~~） | 35.3、41.8 |
| CSS-3D 两只（112 + 229） | — | 96.2、96.4 |
| canvas 两只 | — | 42.3、28.6 |

删除线 = 离群值，不计入平均（同一轮里连「没开 Safari」都读到 93.9，说明当时有别的东西在动屏幕；测量期间主会话也在同一台机上跑 WKWebView A/B 和 Mac 构建）。Safari 第 3、4 轮作废：CSS 版只读到 18–30%，与前两轮和 WKWebView 全部矛盾，最可能是 Safari 窗口被挡在后面没在画（WebKit 不画被遮住的窗口）。原始记录：`measure-raw.txt`。

**结论：** 换成 canvas，WindowServer 少 **约 55–60 个百分点**（WKWebView 91 → 30；Safari 94 → ~40），落在「没有小M」的同一区间。与主会话的数字一致：3D 小M 上只要有一个动画在跑就 ~95%，`paused` 仍 ~90%，全部 `animation: none` ~33%。也就是说 canvas 版在**一直动着**的情况下，已经达到 CSS 版「完全不动」的水平。

**未验证：**
- Safari 只有一轮干净数据（r1/r2 共 2 个有效读数/项），没有补测（用户要求停止开窗口）。
- 没测 WebContent 进程自己的 CPU（canvas 每帧 JS 画 193 个图元，预计很小，未量）。
- 没在 iPhone / iPad Safari、Android Chrome、装好的 Mac App 里测。
- 没测「两只以上同时在屏」（聊天头像 + 按钮 + PIN）时 canvas 的累计开销。

## 2. 像不像（逐项）

截图：`shots/chromium-*.png`（headless Chrome，2×，完整两排），`shots/webkit-*.png`（WKWebView 快照，1×，窗口只截到 112 那排和 229 的上半）。姿态：rest = t 1.3 s（浮到最高）、blink = 3.0 s（眼皮全闭）、look-left = 7.62 s、look-right = 9.49 s、listen = 0.25 s（点头最低）、think。

| 项 | 结果 |
|---|---|
| 轮廓、比例、透视（相机在上方 30% 处，能看到顶面和侧壁） | 一致：同一套几何、同一透视公式 |
| 机身正面渐变 + 左上打光（`.m25lit`） | 一致 |
| 机身侧壁明暗（`rim` 条按朝向 `shade()`） | 一致；canvas 侧壁的分段折面在转头时略明显（CSS 里叠层切片会把缝补平一点） |
| 镜圈、镜片、瞳孔、两点高光、白色弧光 | 一致；镜片外圈那一圈灰与 WebKit / Chromium 1× 的 CSS 版一致（headless 2× 的 CSS 截图里这圈偏白，是那个渲染路径的差异） |
| 眨眼：眼皮形状、渐变、睫毛线、闭合时侧面变橙（x5lidside） | 一致，时间点按原关键帧（9 s 一循环，33% 一次、87% 两连眨） |
| x5bob 浮动 | 一致 |
| x5look 转头（−14° / +12°） | 一致；正面用中心仿射近似透视，最大误差 < 1 px |
| `.listen`（x5nod）、`.think`（−7° / −16°，0.3 s 过渡） | 一致（Chromium 截图对得上） |
| 脚、地面阴影 | canvas 有；**WebKit 快照里 CSS 版没画脚和阴影**，Chromium 有。可能是快照漏画，也可能 Safari 真没画（11-18 已知「Safari 可能漏画小M 的部分图层」）——**未验证**，需要在屏幕上看一眼 Safari |
| 簇毛中间那块侧立面 | canvas 把正对镜头时 < 0.5 px 宽的面直接不画；CSS 有时画出一根细线 |
| 抗锯齿 | canvas 按 devicePixelRatio 出图，边缘略干净；CSS 切片边缘有时有亮缝 |
| WebKit 快照里 CSS 版的转头 / 点头 | 快照里 CSS 版没呈现暂停到的姿态（WAAPI 暂停后 WebKit 快照不一定反映），所以这两项的 WebKit 对比**未验证**，以 Chromium 截图为准 |

## 3. 要接进正式版还需要什么

1. **API 不变**：`XiaoM.camSVG()` 继续返回 HTML，只是里面换成 `<canvas>` + 一棵**不可见的「骨架」div**（同样的 class：`m25r`、`m25t`、`cm-all`、`cm-body`、`cm-lid`、`cm-pupil`、`cm-tuft`、`cm-blush`…，0×0、无内容）。app.js 照旧往 `.m25` 上加 `hop / cheer / shrug / squish / t-shy / t-spin / t-sneeze / cam-back …`，CSS 关键帧照旧在骨架上跑；canvas 每帧读骨架的 `getComputedStyle().transform / opacity / background` 来画。这样**所有动作不用逐个移植**，`turn()` 的 WAAPI 也照用。（spike 里是手写关键帧；骨架方案未验证，要先确认 WebKit 给这些空 div 的动画不再造成大合成开销——它们没有内容和 preserve-3d，预期很小。）
2. **服装 / 手持物**（HATS / HOLDS，`extrude()` 的 SVG）：每个部件的 SVG 先栅格化成 ImageBitmap 缓存一次，按切片矩阵贴图；侧面切片用 `sideOf()` 的深色版 + `brightness()`。
3. **背面**（`cam-back`：黑屏 + 心 / REC / 数字）、`cm-burst`、`cm-blush / brow / sweat`：在正面/背面绘制函数里按骨架 opacity 画。
4. **生命周期**：MutationObserver 挂载/卸载、ResizeObserver、IntersectionObserver + `html.away`（0.9.45 已有）时停 rAF；`prefers-reduced-motion` 时只画一帧；可选限 30 fps。
5. **删掉** app.js 的 `thinOne()`（canvas 不需要抽片）。
6. **节日 / 生日场景**（`actHtml / festAct / personAct / comboAct / bdFestAct`，几十个道具和编排）先不动，偶尔出现几秒，留 CSS-3D。
7. 回归：PIN 页（cheer / shrug / 转身偷看）、`#mSvg` 按钮各动作、聊天头像、Backup 页镜像动作、深浅色、Safari / Mac App / iOS / Android 截图对比。

## 4. 工作量估计

| 块 | 估计 |
|---|---|
| 渲染核心（本 spike 已有）整理成 vendor 模块 + 骨架读样式 | 1–1.5 天 |
| 服装 / 手持物栅格化贴图 | 1 天 |
| 背面、表情部件、`turn()`、生命周期、降级 | 0.5–1 天 |
| 多端回归 + 修差异 | 1 天 |
| **合计（常驻小M）** | **约 3.5–4.5 天** |
| 节日 / 生日场景也换 canvas（可选，不建议现在做） | 另 5 天以上 |

建议顺序：先在屏幕上补一轮 Safari 测量 + 看一眼 Safari 里 CSS 版的脚（第 1、2 节的「未验证」），再决定是否立项。
