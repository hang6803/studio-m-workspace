# 小M canvas 渲染验证原型（spike）

> 0.9.9 perf 诊断 H3 的验证。**只是 spike**：不在 `src/`、不改 `vendor/xiaom/xiaom.js`、不改版本号、不合并 main。

## 文件

| 文件 | 是什么 |
|---|---|
| `xiaom-canvas.js` | canvas 版小M。`XiaoMCanvas.mount(host, {state, time})` → `{setState, renderAt, play, destroy}` |
| `index.html` | 并排对比页：左 = 现版 CSS-3D（直接加载 `../../vendor/xiaom/xiaom.js` 的 `camSVG`），右 = canvas；112×112（PIN 页）和 229×200（场景卡）各一组 |
| `shots/` | 截图（见结论文档） |

对比页参数：`?show=css|canvas|both|none`、`?size=112|229|both`、`?t=秒`（定格，两边同一时刻）、`?state=listen|think`、`?ui=0`。
本地看：在仓库根目录 `python3 -m http.server 8765`，打开 `http://127.0.0.1:8765/spikes/xiaom-canvas/index.html`。

## 做法

不是重画一张图，而是**把 xiaom.js 里 `build()` 的同一套几何搬过来**：`slab`（层叠切片）、`rim`（圆角侧壁条）、`blob`（脚）、簇毛、白色顶块、镜圈、眼睛，尺寸、颜色、`shade()` 明暗、`.m25lit` 打光、镜片 SVG（渐变、瞳孔、高光、眼皮）全部按原值。
每片切片 / 侧壁条 = 一个带 3D 矩阵的平面图元（每个小M 193 个），矩阵直接用 `DOMMatrix` 解析与 CSS 相同的 transform 字符串；每帧：

1. 动态组：`m25t`（x5look）› `cm-all`（.listen 的 x5nod / .think 倾斜，原点 0 86 0）› `cm-body`（x5bob）；
2. 投影：与 CSS 相同的透视（900 模型 px，透视原点 50% 30%，模型原点 50% 61.5%，盒宽 = 260 模型 px）；
3. 按深度从后往前排序，侧壁条按 4 个投影角点填多边形（精确），正面类按中心做仿射拟合（正对镜头时精确，转头 ±14° 时边缘误差 < 1 px）；
4. 眨眼：x5lid 关键帧（含每段 cubic-bezier）驱动眼皮；x5lidside 把镜片白色侧面渐变成 #e57519，与 CSS 一致。

关键帧逐段照 CSS 语义实现（每段用起点关键帧的 timing function），定格 `?t=` 时 CSS 侧用 `document.getAnimations()` 暂停到同一 currentTime，两边同一姿态可直接对比。
