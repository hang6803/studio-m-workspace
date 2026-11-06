// 小M — the Studio M mascot, 2.5D: how it looks, its outfits (hats / things it holds), its moves and its festival & birthday scenes.
// Built from the drafts in xiaom/drafts (scenes.html, actions.html). The app only talks to window.XiaoM, so replacing this one
// file changes 小M everywhere (tools/sync_xiaom.sh). Keep every name in the XiaoM object below (turn is optional); if this file fails to load,
// the app simply runs without 小M.
(function () {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const st = document.createElement("style"); st.id = "xiaom-css";
  st.textContent = `
/* ---------- 2.5D frame: 小M is built from stacked slices; .m25s holds any 2.5D 小M (the app's own one and the scenes) ---------- */
.m25s { --orange: #f48020; --orange-side: #cf6612; --orange-deep: #b0560e; --text: var(--fg) }
.m25s div { transform-style: preserve-3d }
.m25s svg { transform-style: flat }
.m25s .abs { position: absolute; left: 0; top: 0 }
.m25s .slice, .m25s .flat { position: absolute }
/* the app's 小M: its box is any size; 1 box width = 260 model px (the flat 小M's 130-unit viewBox at 2 px a unit) */
.m25 { position: relative; container-type: size }
.m25 .m25v { position: absolute; inset: 0; --k: .385; perspective: calc(900px * var(--k)); perspective-origin: 50% 30% }
@supports (width: calc(1px * tan(atan2(1px, 1px)))) { .m25 .m25v { --k: tan(atan2(100cqw, 260px)) } }
.m25 .m25w { position: absolute; left: 50%; top: 61.5%; width: 0; height: 0; transform: scale3d(var(--k), var(--k), var(--k)) }
.m25 .m25sh { position: absolute; left: -110px; top: -60px; width: 220px; height: 120px; border-radius: 50%; background: radial-gradient(closest-side, rgba(0, 0, 0, .4), transparent); transform: translate3d(0, 90px, 0) rotateX(90deg) }
.m25 .m25o { position: absolute; inset: 0; pointer-events: none }
/* light: key light from the upper left. Fronts get a sheen (lit top-left, shaded bottom-right), round edges are shaded by the way they face, 小M casts a soft shadow */
.m25s .m25lit { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(60% 50% at 26% 20%, rgba(255, 255, 255, .5), rgba(255, 255, 255, 0) 70%), linear-gradient(135deg, rgba(255, 255, 255, .22) 0%, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, .42) 100%); -webkit-mask-size: 100% 100%; mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat }
.m25-scene .m25sh { position: absolute; left: -120px; top: -66px; width: 240px; height: 132px; border-radius: 50%; background: radial-gradient(closest-side, rgba(0, 0, 0, .62), rgba(0, 0, 0, .25) 55%, transparent); transform: translate3d(34px, 99px, -18px) rotateX(90deg) skewX(-18deg) }
.m25 .m25sh2, .m25-scene .m25sh2 { position: absolute; left: -100px; top: -26px; width: 200px; height: 52px; border-radius: 50%; background: radial-gradient(closest-side, rgba(0, 0, 0, .55), rgba(0, 0, 0, .2) 70%, transparent); transform: translate3d(4px, 99px, 6px) rotateX(90deg) }
.m25 .m25sh2 { transform: translate3d(4px, 90px, 6px) rotateX(90deg) }
.m25-scene .m25psh { position: absolute; border-radius: 50%; background: radial-gradient(closest-side, rgba(0, 0, 0, .55), rgba(0, 0, 0, .18) 65%, transparent) }
/* each scene can light its own way: sunset behind (hang), moon + street lamp (mun), golden sky (michael) */
.m25-light.l-sunset { background: radial-gradient(70% 55% at 62% 40%, rgba(255, 170, 90, .22), transparent 70%), radial-gradient(140% 120% at 50% 45%, transparent 45%, rgba(10, 6, 20, .55) 100%) }
.m25-light.l-night { background: radial-gradient(45% 40% at 80% 8%, rgba(190, 210, 255, .16), transparent 70%), radial-gradient(40% 55% at 26% 40%, rgba(255, 200, 120, .16), transparent 70%), radial-gradient(140% 120% at 50% 45%, transparent 40%, rgba(0, 4, 18, .6) 100%) }
.m25-light.l-gold { background: radial-gradient(90% 70% at 50% 30%, rgba(255, 220, 150, .2), transparent 65%), radial-gradient(140% 120% at 50% 45%, transparent 50%, rgba(10, 14, 40, .45) 100%) }
.m25-light { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: inherit; background: radial-gradient(120% 90% at 22% 8%, rgba(255, 236, 210, .22), transparent 55%), radial-gradient(140% 120% at 50% 45%, transparent 45%, rgba(0, 0, 0, .5) 100%) }
/* festival / birthday scenes on the app's 229x200 card: the model is 2.6x the card, so the world is scaled back down */
.m25-scene { position: absolute; inset: 0; perspective: 840px; perspective-origin: 114px 118px; pointer-events: none }
.m25-scene .m25sw { position: absolute; left: 114px; top: 146px; width: 0; height: 0; transform: scale3d(.3846, .3846, .3846) }

/* ---------- 小M's parts (same hook names as the flat 小M: the app adds its moods / moves to .cam-svg) ---------- */
.m25s .cm-all { transform-origin: 0 86px 0 }
.m25s .m25-decal { transition: opacity .1s }
.m25-edge .m25-decal { opacity: 0 }
.m25s .cm-body { animation: x5bob 2.6s ease-in-out infinite }
@keyframes x5bob { 50% { transform: translateY(-7px) scale(1.01, 1.02) } }
.m25s .cm-lid { transform-box: fill-box; transform-origin: 50% 0; transform: scaleY(0); animation: x5blink 4.6s ease-in-out infinite }
@keyframes x5blink { 0%, 93%, 100% { transform: scaleY(0) } 96% { transform: scaleY(1) } }
.m25s .cm-pupil { transition: transform .35s cubic-bezier(.2, .7, .3, 1) }
.m25s .cm-blush { opacity: 0; transition: opacity .35s }
.m25s .cm-tuft { transform-origin: 0 17px }
.m25s .cm-burst { border-radius: 50%; background: #fff }
.m25s .scr-rec, .m25s .scr-num { display: none }
.m25s .scr-heart { transform-box: fill-box; transform-origin: center }
/* facing away (the card's back) */
.m25:not(.cam-back) .m25t { animation: x5look 11s ease-in-out 3s infinite }
@keyframes x5look { 0%, 30%, 100% { transform: none } 38%, 46% { transform: rotateY(-14deg) rotateX(-3deg) } 56%, 62% { transform: rotateY(12deg) } 70% { transform: none } }
.m25.cam-back .m25t { transform: rotateY(180deg) }
.m25.cam-back .cm-all { animation: x5backIdle 7s ease-in-out 2s infinite }
@keyframes x5backIdle { 0%, 86%, 100% { transform: none } 89% { transform: rotateZ(-5deg) } 92% { transform: rotateZ(5deg) } 95% { transform: rotateZ(-3deg) } }
.m25.scr-1 .scr-heart, .m25.scr-2 .scr-heart { display: none }
.m25.scr-1 .scr-rec, .m25.scr-2 .scr-num { display: inline }
.m25.scr-1 .scr-rec circle { animation: x5rec 1s steps(2, jump-none) infinite }
@keyframes x5rec { 50% { opacity: .15 } }
.m25.wiggle .cm-all { animation: x5wiggle .9s ease-in-out 1 }
@keyframes x5wiggle { 15% { transform: rotateY(-18deg) rotateZ(-6deg) } 35% { transform: rotateY(18deg) rotateZ(6deg) } 55% { transform: rotateY(-12deg) rotateZ(-4deg) } 75% { transform: rotateY(8deg) } 100% { transform: none } }
.m25.wiggle .scr-heart { animation: x5hbeat .45s ease-in-out 2 }
@keyframes x5hbeat { 50% { transform: scale(1.35) } }
/* moods */
.m25.worried .cm-brow, .m25.fret .cm-brow { opacity: 1 }
.m25.worried .cm-sweat { animation: x5sweat 7s ease-in 2s infinite }
.m25.fret .cm-sweat { animation: x5sweat 1.2s ease-in 0s 2 }
@keyframes x5sweat { 0%, 70% { opacity: 0; transform: translateY(0) } 75% { opacity: .9 } 95% { opacity: .9; transform: translateY(8px) } 100% { opacity: 0; transform: translateY(10px) } }
.m25.sleepy .cm-lid { animation: none; transform: scaleY(.62) }
.m25.sleepy .cm-body { animation-duration: 4.2s }
.m25.yawn .cm-lid { animation: none; transform: scaleY(.45) }
/* moves */
.m25.squish .cm-all { animation: x5squish .7s ease-out 1 }
@keyframes x5squish { 25% { transform: scale3d(1.14, .84, 1.2) rotateX(10deg) } 50% { transform: scale3d(.93, 1.1, .9) rotateX(-6deg) } 72% { transform: scale3d(1.04, .97, 1.04) } }
.m25.squish .cm-lid { animation: x5wink .35s ease-in-out 1 }
@keyframes x5wink { 50% { transform: scaleY(1) } }
.m25.squish .cm-burst { animation: x5burst .5s ease-out 1 }
@keyframes x5burst { 0% { opacity: 1; transform: translateZ(12px) scale(.2) } 100% { opacity: 0; transform: translateZ(12px) scale(3) } }
.m25.hop .cm-all { animation: x5hop .7s cubic-bezier(.3, .9, .4, 1) 1 }
.m25.cheer .cm-all { animation: x5hop .6s cubic-bezier(.3, .9, .4, 1) 3 }
@keyframes x5hop { 0% { transform: translateY(0) scale3d(1.06, .92, 1.06) rotateX(8deg) } 35% { transform: translateY(-58px) scale3d(.96, 1.06, .96) rotateX(-14deg) rotateY(12deg) } 70% { transform: translateY(0) scale3d(1.06, .94, 1.06) rotateX(6deg) } 100% { transform: none } }
.m25.shrug .cm-all { animation: x5shrug 1.2s ease-in-out 1 }
.m25.fret .cm-all { animation: x5shrug .9s ease-in-out 1 }
@keyframes x5shrug { 20%, 60% { transform: translateY(-11px) rotateZ(-8deg) rotateY(-22deg) } 40% { transform: translateY(-11px) rotateZ(6deg) rotateY(20deg) } }
.m25.land .cm-all { animation: x5land .45s cubic-bezier(.3, .9, .4, 1) 1 }
@keyframes x5land { 0% { transform: scale3d(1.12, .86, 1.12) rotateX(12deg) } 55% { transform: scale3d(.96, 1.05, .96) rotateX(-4deg) } 100% { transform: none } }
.m25.nod .cm-all { animation: x5nod .3s ease-in-out 1 }
@keyframes x5nod { 50% { transform: translateY(4px) rotateX(-18deg) } }
.m25.puzzled .cm-all { transform: rotateZ(-7deg) rotateY(-16deg); transition: transform .3s cubic-bezier(.2, .8, .2, 1) }
.m25.t-ha .cm-all { animation: x5ha .76s ease-in both }
.m25.t-ha .cm-lid { animation: none; transform: scaleY(.55) }
@keyframes x5ha { 0% { transform: none } 100% { transform: translateY(-11px) rotateX(-22deg) rotateZ(-4deg) scale(.98, 1.05) } }
.m25.t-sneeze .cm-all { animation: x5sneeze .9s cubic-bezier(.2, .8, .3, 1) both }
.m25.t-sneeze .cm-lid { animation: none; transform: scaleY(1) }
@keyframes x5sneeze { 0% { transform: translateY(-11px) rotateX(-22deg) rotateZ(-4deg) } 12% { transform: translate3d(0, 7px, 30px) rotateX(28deg) scale3d(1.08, .9, 1.08) } 30% { transform: translate3d(-25px, -22px, -20px) rotateX(-8deg) rotateY(-20deg) } 55% { transform: translate(-11px, 0) rotateY(8deg) } 100% { transform: none } }
.m25.t-sneeze .cm-tuft { animation: x5tuft .7s ease-out both }
@keyframes x5tuft { 15% { transform: rotateZ(-38deg) scaleY(1.3) } 35% { transform: rotateZ(30deg) } 55% { transform: rotateZ(-16deg) } 75% { transform: rotateZ(8deg) } 100% { transform: none } }
.m25.t-shy .cm-blush { opacity: .8 }
.m25.t-shy .cm-all { animation: x5shy 1.7s cubic-bezier(.3, .7, .3, 1) both }
.m25.t-shy .cm-lid { animation: x5shyBlink 1.7s ease-in-out both }
@keyframes x5shy { 0% { transform: none } 18%, 78% { transform: translateX(-25px) rotateY(-38deg) rotateX(10deg) rotateZ(-6deg) scale(.95) } 100% { transform: none } }
@keyframes x5shyBlink { 0%, 100% { transform: scaleY(0) } 12%, 22% { transform: scaleY(1) } 30%, 50% { transform: scaleY(.45) } 56%, 62% { transform: scaleY(1) } 70%, 90% { transform: scaleY(.45) } }
.m25.t-spin .cm-all { animation: x5spin .9s cubic-bezier(.4, 0, .2, 1) both }
@keyframes x5spin { 0% { transform: none } 12% { transform: scale(1.05, .92) } 50% { transform: translateY(-40px) rotateY(180deg) } 88% { transform: rotateY(360deg) scale(1.05, .93) } 100% { transform: rotateY(360deg) } }
@media (prefers-reduced-motion: reduce) {
  .m25s, .m25s * { animation-duration: .001s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition: none !important }
  .m25-scene .fb, .m25-scene .bp, .m25-scene .k2s, .m25-scene .kflash { display: none }
  .cam-svg.sleepy .cm-zzz text { opacity: 1 }
}

/* ---------- festival & birthday choreography (from the 2.5D scenes draft; keyframes prefixed x5) ---------- */
.m25s .mbob{animation:x5mbob 2.6s ease-in-out infinite}
@keyframes x5mbob{50%{transform:translateY(-7px) scale(1.01,1.02)}}
.m25s .lid{transform-box:fill-box;transform-origin:50% 0;transform:scaleY(0);animation:x5blink 4.6s ease-in-out infinite}
@keyframes x5blink{0%,93%,100%{transform:scaleY(0)}96%{transform:scaleY(1)}}
.m25s .a-sway{animation:x5psway 2.4s ease-in-out infinite}
@keyframes x5psway{0%,100%{transform:rotateZ(-7deg)}50%{transform:rotateZ(7deg)}}
.m25s .a-flame{animation:x5pflame .9s ease-in-out infinite}
@keyframes x5pflame{30%{transform:scale(.9,1.12) rotateZ(-4deg)}60%{transform:scale(1.06,.94) rotateZ(3deg)}}
.m25s .a-steam{animation:x5psteam 2.2s ease-out infinite;opacity:0}
.m25s .a-steam.b{animation-delay:1.1s}
@keyframes x5psteam{30%{opacity:.6}100%{opacity:0;transform:translateY(-16px)}}
.m25s .s-hang{animation:x5sDrop .9s cubic-bezier(.3,1.4,.5,1) both,x5hang 2.4s ease-in-out .9s infinite}
.m25s .s-hang.b{animation-delay:.15s,1.2s}
@keyframes x5sDrop{from{transform:translateY(-208px)}}
@keyframes x5hang{0%,100%{transform:rotateZ(-6deg)}50%{transform:rotateZ(6deg)}}
.m25s .s-bow{animation:x5sBow 4s ease-out both}
@keyframes x5sBow{0%{transform:translateY(338px)}18%{transform:translateY(-36px)}26%{transform:none}38%{transform:rotateX(-26deg) scaleY(.94)}46%{transform:none}56%{transform:rotateX(-26deg) scaleY(.94)}64%,100%{transform:none}}
.m25s .s-salam{animation:x5sSalam 4s ease-out both}
@keyframes x5sSalam{0%{transform:translateX(-520px)}26%{transform:translateX(16px)}32%{transform:none}44%{transform:rotateX(-22deg) scaleY(.95)}54%{transform:none}64%{transform:rotateX(-22deg) scaleY(.95)}72%,100%{transform:none}}
.m25s .s-row{animation:x5sRow 4s ease-out both}
@keyframes x5sRow{0%{transform:translateX(-650px)}50%{transform:translateX(21px)}60%,100%{transform:none}}
.m25s .s-paddle{animation:x5sPaddle .5s ease-in-out infinite}
@keyframes x5sPaddle{50%{transform:rotateZ(-5deg) translateY(5px)}}
.m25s .s-water{animation:x5sWave 1.2s linear infinite}
@keyframes x5sWave{to{background-position:-104px 0}}
.m25s .s-moon{animation:x5sMoon 2s cubic-bezier(.2,.7,.3,1) both}
@keyframes x5sMoon{from{transform:translateY(312px)}}
.m25s .s-tw{border-radius:50%;background:#fff;animation:x5tw 1.6s ease-in-out infinite}
@keyframes x5tw{50%{opacity:.15;transform:scale(.5)}}
.m25s .s-swayM{animation:x5sIn .8s cubic-bezier(.3,1.3,.5,1) .4s both,x5sSwayM 2.4s ease-in-out 1.2s infinite}
@keyframes x5sIn{from{transform:translateY(312px)}}
@keyframes x5sSwayM{50%{transform:rotateZ(-6deg)}}
.m25s .s-bounce{animation:x5sIn .7s cubic-bezier(.3,1.3,.5,1) both,x5sHop .55s ease-in-out .9s 3}
@keyframes x5sHop{50%{transform:translateY(-42px) scale(.97,1.04)}}
.m25s .s-steam{border-radius:50%;background:#fff;filter:blur(6px);opacity:0;animation:x5puff 2s ease-out infinite}
@keyframes x5puff{20%{opacity:.7}100%{opacity:0;transform:translateY(-120px) scale(1.6)}}
.m25s .s-snow{border-radius:50%;background:#fff;opacity:0;animation:x5sSnow var(--d) linear var(--dl) infinite}
@keyframes x5sSnow{10%{opacity:.9}100%{transform:translate(21px,546px);opacity:.4}}
.m25s .s-chim{animation:x5sChim 4s cubic-bezier(.3,1.2,.5,1) both}
.m25s .s-count{font-weight:800;font-size:110px;color:#fff;text-align:center;opacity:0;animation:x5sCount 1s ease-out both}
@keyframes x5sCount{0%{opacity:0;transform:scale(1.8)}20%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(.7)}}
.m25s .s-pop{font-weight:800;font-size:40px;color:var(--orange);text-align:center;white-space:nowrap;opacity:0;animation:x5sPop 4.4s ease-out both}
@keyframes x5sPop{0%,62%{opacity:0;transform:scale(.3)}70%{opacity:1;transform:scale(1.2)}78%,92%{opacity:1;transform:none}100%{opacity:0}}
.m25s .s-late{animation:x5sIn .8s cubic-bezier(.3,1.3,.5,1) 2.6s both,x5sHop .5s ease-in-out 3.4s 3}
.m25s .s-fw{border-radius:50%;opacity:0;background:repeating-conic-gradient(var(--c) 0 3deg,transparent 3deg 22.5deg);-webkit-mask:radial-gradient(circle,transparent 0 22%,#000 23% 48%,transparent 49%);mask:radial-gradient(circle,transparent 0 22%,#000 23% 48%,transparent 49%);animation:x5sFw 1.6s ease-out var(--dl) both}
@keyframes x5sFw{0%{opacity:0;transform:scale(.1)}15%{opacity:1}100%{opacity:0;transform:scale(1.4)}}
.m25s .s-toss{border-radius:50%;background:var(--orange);border:4px solid #141414;opacity:0;animation:x5sToss 2.4s cubic-bezier(.3,0,.7,1) var(--dl) both}
@keyframes x5sToss{0%{opacity:1;transform:translate(0,0)}50%{transform:translate(260px,-260px) rotate(180deg)}100%{opacity:1;transform:translate(520px,40px) rotate(360deg)}}
.m25s .s-floatL{border-radius:50%;background:#ffe2a8;box-shadow:0 0 18px 6px rgba(255,190,90,.6);opacity:0;animation:x5sFloatL 4s ease-out var(--dl) both}
@keyframes x5sFloatL{0%{opacity:0;transform:translateY(60px)}20%{opacity:1}100%{opacity:0;transform:translateY(-420px)}}
.m25s .s-march{animation:x5sMarch 4s ease-out both}
@keyframes x5sMarch{0%{transform:translateX(-560px)}8%{transform:translateX(-490px) translateY(-18px)}16%{transform:translateX(-420px)}24%{transform:translateX(-350px) translateY(-18px)}32%{transform:translateX(-280px)}40%{transform:translateX(-210px) translateY(-18px)}48%{transform:translateX(-140px)}56%{transform:translateX(-70px) translateY(-18px)}64%{transform:none}72%{transform:translateY(-60px) scale(.97,1.04)}80%{transform:none}88%{transform:translateY(-60px) scale(.97,1.04)}96%,100%{transform:none}}
.m25s .s-bunt{animation:x5sDrop .9s cubic-bezier(.3,1.4,.5,1) .2s both}
/* ---------- per-person birthday scenes (8s): Hang = 山海舟上, Michael = 乘龙云海 ---------- */
.m25-ov{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:inherit}
.m25-ov>div{position:absolute;inset:0}
.m25-ov .u-warm{z-index:1}.m25-ov .u-dark{z-index:2}.m25-ov .u-scare{z-index:3}.m25-ov .u-booBig{z-index:4}.m25-ov .u-flash,.m25-ov .m-flash{z-index:5}
.m25s .pb-hide{backface-visibility:hidden;-webkit-backface-visibility:hidden}
.m25s .h-far{animation:x5hFar 8s cubic-bezier(.4,0,.2,1) both}
.m25s .h-mid{animation:x5hMid 8s cubic-bezier(.4,0,.2,1) both}
.m25s .h-cam{animation:x5hCam 8s cubic-bezier(.4,0,.2,1) both}
@keyframes x5hFar{0%{transform:scale(1)}38%,100%{transform:scale(1.1)}}
@keyframes x5hMid{0%{transform:scale(1)}38%,100%{transform:scale(1.28)}}
@keyframes x5hCam{0%{transform:scale(.38)}38%,100%{transform:scale(1)}}
.m25s .h-sea{animation:x5hSea 3s linear infinite}
@keyframes x5hSea{to{background-position:-120px 0}}
.m25s .h-boat{animation:x5hRock 3s ease-in-out infinite}
@keyframes x5hRock{50%{transform:translateY(8px) rotateZ(1.5deg)}}
.m25s .h-turn{animation:x5hTurn 8s ease-in-out both}
@keyframes x5hTurn{0%,34%{transform:rotateY(180deg)}37%{transform:rotateY(180deg) rotateZ(-3deg)}40%{transform:rotateY(180deg) rotateZ(3deg)}42%{transform:rotateY(180deg)}
  46%{transform:translateY(-40px) rotateY(90deg)}50%{transform:translateY(6px) rotateY(0) scale(1.06,.94)}54%,100%{transform:none}}
.m25s .h-face{opacity:0;animation:x5hFace 8s linear both}
@keyframes x5hFace{0%,49%{opacity:0}51%,100%{opacity:1}}
.m25s .h-lines{opacity:0;animation:x5hFace 8s linear both,x5hShiver .25s linear 4.2s 6}
@keyframes x5hShiver{50%{transform:translateX(2px)}}
.m25s .h-grin{opacity:0;transform-origin:50% 0;animation:x5hGrin 8s ease-out both}
@keyframes x5hGrin{0%,52%{opacity:0;transform:scaleY(.2)}56%{opacity:1;transform:scaleY(1.1)}60%,100%{opacity:1;transform:none}}
.m25s .h-cake{opacity:0;animation:x5hCake 8s cubic-bezier(.5,0,.8,.4) both}
@keyframes x5hCake{0%,64%{opacity:0;transform:scale(0)}67%{opacity:1;transform:scale(1.15)}70%{opacity:1;transform:translateY(-20px) scale(1)}
  73%{opacity:1;transform:translate3d(0,-60px,120px) rotateZ(-8deg)}80%{opacity:1;transform:translate3d(0,-40px,1900px) rotateZ(14deg)}81%,100%{opacity:0;transform:translate3d(0,-40px,1900px)}}
.m25s .h-wind{animation:x5hWind 8s ease-in both}
@keyframes x5hWind{0%,68%{transform:none}72%{transform:rotateX(-20deg) translateY(10px)}77%,100%{transform:none}}
.m25s .h-splat{opacity:0;transform-origin:50% 45%;animation:x5hSplat 8s ease-out both}
@keyframes x5hSplat{0%,79%{opacity:0;transform:scale(1.6)}80%{opacity:1;transform:scale(1.05)}82%,100%{opacity:1;transform:none}}
.m25s .h-drip{animation:x5hDrip 8s ease-in both}
@keyframes x5hDrip{0%,82%{transform:scaleY(.3)}96%,100%{transform:scaleY(1)}}
.m25s .h-msg{opacity:0;animation:x5hMsg 8s ease-out both}
@keyframes x5hMsg{0%,83%{opacity:0;transform:scale(.6)}87%,100%{opacity:1;transform:none}}
.m25s .m-cloud{border-radius:50%;background:#fff;filter:blur(10px);animation:x5mCloud var(--d,14s) linear infinite}
@keyframes x5mCloud{from{transform:translateX(0)}to{transform:translateX(var(--dx,-180px))}}
.m25s .m-shake{animation:x5mShake 8s linear both}
@keyframes x5mShake{0%,47%{transform:none}48%{transform:translate(14px,-10px)}49%{transform:translate(-16px,12px)}50%{transform:translate(12px,8px)}51%{transform:translate(-10px,-8px)}52%{transform:translate(6px,4px)}54%,71%{transform:none}72%{transform:translate(-10px,8px)}73%{transform:translate(10px,-6px)}74%{transform:translate(-5px,3px)}76%,100%{transform:none}}
.m25s .m-flash{background:#fff;opacity:0;animation:x5mFlash 8s linear both}
@keyframes x5mFlash{0%,4%{opacity:0}5%{opacity:.95}7%{opacity:0}9%{opacity:.7}11%,47%{opacity:0}48%{opacity:.5}51%,100%{opacity:0}}
.m25s .m-bolt{opacity:0;animation:x5mBolt 8s linear both}
@keyframes x5mBolt{0%,4%{opacity:0}5%,7%{opacity:1}8%{opacity:0}9%,10%{opacity:1}11%,100%{opacity:0}}
.m25s .m-fly{opacity:0;animation:x5mFly 8s cubic-bezier(.4,0,.6,1) both}
@keyframes x5mFly{0%,11%{opacity:0;transform:translate(900px,40px)}12%{opacity:1;transform:translate(820px,40px)}20%{transform:translate(0,-60px) rotateZ(-6deg)}29%{opacity:1;transform:translate(-1100px,20px)}30%,100%{opacity:0;transform:translate(-1100px,20px)}}
.m25s .m-ride{animation:x5mRide 8s cubic-bezier(.2,.7,.3,1) both}
@keyframes x5mRide{0%,30%{transform:translate(-620px,-1000px) rotateZ(-28deg) scale(.7)}40%{transform:translate(-160px,-300px) rotateZ(-16deg) scale(.95)}47%{transform:translate(0,30px) rotateZ(3deg) scale(1.04,.94)}51%{transform:translate(0,-16px)}55%,100%{transform:none}}
.m25s .m-bob{animation:x5mBob 2.4s ease-in-out 4.6s infinite}
@keyframes x5mBob{50%{transform:translateY(-14px)}}
.m25s .m-seg{animation:x5mSeg 1.4s ease-in-out var(--dl) infinite}
@keyframes x5mSeg{50%{transform:translateY(-18px)}}
.m25s .m-ring{border-radius:50%;border:8px solid #fff;opacity:0;animation:x5mRing 8s ease-out both}
@keyframes x5mRing{0%,47%{opacity:0;transform:scale(.2)}48%{opacity:1;transform:scale(.3)}60%,100%{opacity:0;transform:scale(3.2)}}
.m25s .m-burst{border-radius:50%;background:#fff;filter:blur(6px);opacity:0;animation:x5mBurst 8s ease-out both}
@keyframes x5mBurst{0%,47%{opacity:0;transform:none}48%{opacity:.95}62%,100%{opacity:0;transform:translate(var(--bx),var(--by)) scale(2.2)}}
.m25s .m-rays{opacity:0;animation:x5mRays 8s ease-out both}
@keyframes x5mRays{0%,57%{opacity:0;transform:scale(.3)}63%,100%{opacity:.85;transform:none}}
.m25s .m-spin{border-radius:50%;background:repeating-conic-gradient(rgba(255,214,102,.55) 0 9deg,transparent 9deg 22.5deg);-webkit-mask:radial-gradient(circle,#000 20%,transparent 70%);mask:radial-gradient(circle,#000 20%,transparent 70%);animation:x5mSpin 12s linear infinite}
@keyframes x5mSpin{to{transform:rotate(360deg)}}
.m25s .m-cake{opacity:0;transform-origin:50% 100%;animation:x5mCake 8s cubic-bezier(.3,1.5,.5,1) both}
@keyframes x5mCake{0%,58%{opacity:0;transform:scale(0) translateY(40px)}65%{opacity:1;transform:scale(1.35)}71%,100%{opacity:1;transform:scale(1.1)}}
.m25s .m-ban{opacity:0;animation:x5mBan 8s cubic-bezier(.2,1.4,.4,1) both}
@keyframes x5mBan{0%,70%{opacity:0;transform:scale(3.2)}73%{opacity:1;transform:scale(.92)}76%,100%{opacity:1;transform:none}}
.m25s .m-glint{border-radius:50%;background:#fff;opacity:0;animation:x5mGlint 8s ease-out both}
@keyframes x5mGlint{0%,62%{opacity:0;transform:scale(0)}66%{opacity:1;transform:scale(1.4)}74%,100%{opacity:0;transform:scale(2.4)}}
.m25s .u-shake{animation:x5uShake 8s linear both}
@keyframes x5uShake{0%,22%{transform:none}23%{transform:translate(18px,-12px) scale(1.04)}24%{transform:translate(-20px,14px)}25%{transform:translate(16px,10px)}26%{transform:translate(-14px,-10px)}27%{transform:translate(10px,6px)}28%{transform:translate(-6px,-4px)}30%,68%{transform:none}
  69%{transform:translate(-16px,10px) scale(1.03)}70%{transform:translate(16px,-12px)}71%{transform:translate(-10px,8px)}72%{transform:translate(6px,-4px)}74%,75%{transform:none}76%{transform:translateY(12px)}78%,100%{transform:none}}
.m25s .u-rumble{animation:x5uRumble 8s linear both}
@keyframes x5uRumble{0%,47%{transform:none}48%,50%,52%,54%,56%,58%,60%,62%,64%,66%{transform:translate(3px,-2px)}49%,51%,53%,55%,57%,59%,61%,63%,65%,67%{transform:translate(-3px,2px)}68%,100%{transform:none}}
.m25s .u-lamp{animation:x5uLamp 8s linear both}
@keyframes x5uLamp{0%,9%{opacity:1}10%{opacity:.15}11%{opacity:1}13%{opacity:.05}14%{opacity:.7}16%{opacity:0}17%{opacity:.4}18%,71%{opacity:0}73%,100%{opacity:1}}
.m25s .u-dark{background:#000;opacity:0;animation:x5uDark 8s linear both}
@keyframes x5uDark{0%,16%{opacity:0}18%,22%{opacity:.88}23%,30%{opacity:.25}32%,70%{opacity:.5}73%,100%{opacity:0}}
.m25s .u-scare{opacity:0;animation:x5uScare 8s cubic-bezier(.2,1.2,.4,1) both}
@keyframes x5uScare{0%,21%{opacity:0;transform:scale(.15) translateY(80px)}23%{opacity:1;transform:scale(1.25)}28%{opacity:1;transform:scale(1.4)}31%,100%{opacity:0;transform:scale(1.8)}}
.m25s .u-booBig{font-weight:900;font-size:72px;color:#fff;text-align:center;-webkit-text-stroke:3px #141414;opacity:0;animation:x5uBooBig 8s ease-out both}
@keyframes x5uBooBig{0%,22%{opacity:0;transform:scale(.3) rotate(-10deg)}24%{opacity:1;transform:scale(1.2) rotate(-6deg)}29%{opacity:1;transform:rotate(-6deg)}31%,100%{opacity:0}}
.m25s .u-ghost{opacity:0;animation:x5uGhost 8s ease-in-out both}
@keyframes x5uGhost{0%,30%{opacity:0;transform:translateY(60px) scale(.6)}34%{opacity:1;transform:translateY(-14px) scale(1.08)}36%{transform:none}38%{transform:rotateZ(-10deg)}40%{transform:rotateZ(10deg)}42%{transform:rotateZ(-8deg)}44%,47%{opacity:1;transform:none}
  52%{transform:translate(-20px,60px) scale(.8,1.3) rotateZ(-20deg)}58%{transform:translate(-50px,140px) scale(.45,1.6) rotateZ(-30deg)}63%{opacity:1;transform:translate(-60px,170px) scale(.05,.3) rotateZ(-40deg)}64%,100%{opacity:0;transform:translate(-60px,170px) scale(0)}}
.m25s .u-me{animation:x5uMe 8s ease-out both}
@keyframes x5uMe{0%,24%{transform:none}27%{transform:translateY(-170px) scale(.9,1.12) rotateZ(-8deg)}31%{transform:translateY(8px) scale(1.1,.88)}33%{transform:translateX(-9px)}34%{transform:translateX(9px)}35%{transform:translateX(-9px)}36%{transform:translateX(9px)}37%{transform:translateX(-6px)}38%{transform:translateX(6px)}39%,100%{transform:none}}
.m25s .u-fx{opacity:0;animation:x5uFx 8s linear both}
@keyframes x5uFx{0%,26%{opacity:0}27%,44%{opacity:1}46%,100%{opacity:0}}
.m25s .u-vac{opacity:0;animation:x5uVac 8s cubic-bezier(.3,1.4,.5,1) both}
@keyframes x5uVac{0%,40%{opacity:0;transform:scale(0)}44%{opacity:1;transform:scale(1.15)}47%,62%{opacity:1;transform:none}64%{transform:scale(1.15,.9)}65%{transform:scale(.92,1.1)}66%{transform:scale(1.25,.85)}67%{transform:scale(.88,1.15)}68%{opacity:1;transform:scale(1.4,.8)}69%,100%{opacity:0;transform:scale(1.8)}}
.m25s .u-swirl{opacity:0;animation:x5uSwirlO 8s linear both}
@keyframes x5uSwirlO{0%,47%{opacity:0;transform:scale(.4)}50%,62%{opacity:.9;transform:none}64%,100%{opacity:0;transform:scale(.2)}}
.m25s .u-swirl i{position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(rgba(255,255,255,.7) 0 6deg,transparent 6deg 30deg,rgba(244,128,32,.6) 30deg 34deg,transparent 34deg 60deg);-webkit-mask:radial-gradient(circle,transparent 10%,#000 30%,transparent 70%);mask:radial-gradient(circle,transparent 10%,#000 30%,transparent 70%);animation:x5mSpin .6s linear infinite reverse}
.m25s .u-suck{opacity:0;animation:x5uSuck 8s linear both}
.m25s .u-suck path{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-dasharray:10 12;animation:x5fFlow .25s linear infinite;opacity:.9}
.m25s .u-suck path:nth-child(even){stroke:var(--orange);animation-duration:.2s}
@keyframes x5uSuck{0%,47%{opacity:0}49%,62%{opacity:1}65%,100%{opacity:0}}
.m25s .u-word{font-weight:900;font-size:40px;color:var(--orange);-webkit-text-stroke:2px #141414;white-space:nowrap;opacity:0;animation:x5uWord 8s ease-out both}
@keyframes x5uWord{0%,58%{opacity:0;transform:scale(.3) rotate(8deg)}61%{opacity:1;transform:scale(1.25) rotate(8deg)}66%{opacity:1;transform:rotate(8deg)}68%,100%{opacity:0}}
.m25s .u-flash{background:#fff;opacity:0;animation:x5uFlash 8s linear both}
@keyframes x5uFlash{0%,68%{opacity:0}69%{opacity:1}72%,100%{opacity:0}}
.m25s .u-puff{border-radius:50%;background:#fff;opacity:0;filter:blur(3px);animation:x5uPuff 8s ease-out both}
@keyframes x5uPuff{0%,68%{opacity:0;transform:scale(.2)}70%{opacity:.95;transform:scale(1.4)}78%,100%{opacity:0;transform:translateY(-40px) scale(2.4)}}
.m25s .u-cake{opacity:0;transform-origin:50% 100%;animation:x5uCake 8s cubic-bezier(.5,0,.7,1) both}
@keyframes x5uCake{0%,71%{opacity:0;transform:translateY(-560px)}72%{opacity:1;transform:translateY(-560px)}76%{opacity:1;transform:none;animation-timing-function:ease-out}78%{transform:scale(1.25,.7)}81%{transform:scale(.92,1.1)}84%,100%{opacity:1;transform:none}}
.m25s .u-warm{opacity:0;background:radial-gradient(ellipse at 50% 70%,rgba(244,128,32,.45),transparent 65%);animation:x5uWarm 8s ease-out both}
@keyframes x5uWarm{0%,74%{opacity:0}80%,100%{opacity:1}}
.m25s .u-ban{opacity:0;animation:x5uBan 8s cubic-bezier(.2,1.4,.4,1) both}
@keyframes x5uBan{0%,78%{opacity:0;transform:scale(3.2)}81%{opacity:1;transform:scale(.92)}84%,100%{opacity:1;transform:none}}
@keyframes x5sChim{0%,22%{transform:translateY(112px)}40%{transform:translateY(-88px)}50%,100%{transform:translateY(-68px)}}
.m25s .s-diya .dl{opacity:0;animation:x5lit .4s ease-out both;animation-delay:inherit}
.m25s .s-diya{animation-fill-mode:both}
@keyframes x5lit{to{opacity:1}}
.m25s .s-rise{animation:x5sIn .8s cubic-bezier(.3,1.3,.5,1) .3s both}
.m25s .s-ring{border-radius:50%;border:5px dashed var(--orange);opacity:0;animation:x5sRing 3s ease-out 2.2s both}
@keyframes x5sRing{0%{opacity:0;transform:scale(.4) rotate(0)}30%{opacity:.9}100%{opacity:0;transform:scale(1.5) rotate(120deg)}}
.m25s .s-peek{animation:x5sPeek 4s cubic-bezier(.3,1.3,.5,1) both}
@keyframes x5sPeek{0%,20%{transform:translateY(182px)}34%{transform:translateY(-62px)}40%{transform:translateY(-42px) rotateZ(-6deg)}46%{transform:translateY(-42px) rotateZ(6deg)}52%,100%{transform:translateY(-42px)}}
.m25s .s-boo{font-weight:800;font-size:46px;color:var(--orange);opacity:0;white-space:nowrap;animation:x5sBoo 4s ease-out both}
@keyframes x5sBoo{0%,32%{opacity:0;transform:scale(.3)}38%{opacity:1;transform:scale(1.3) rotate(-8deg)}46%,85%{opacity:1;transform:rotate(-8deg)}100%{opacity:0}}
.m25s .s-bat{animation:x5sBat 3.4s ease-in-out .3s both}
.m25s .s-bat.b{animation-delay:1.2s}
@keyframes x5sBat{0%{transform:translateX(-130px)}50%{transform:translate(286px,-36px)}100%{transform:translate(676px,16px)}}
.m25s .wg{animation:x5flap .22s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes x5flap{50%{transform:scaleY(.35)}}
.m25s .s-fromL{animation:x5sFromL 4s cubic-bezier(.3,1.1,.5,1) both}
.m25s .s-fromR{animation:x5sFromR 4s cubic-bezier(.3,1.1,.5,1) both}
@keyframes x5sFromL{0%{transform:translateX(-416px)}24%{transform:none}34%{transform:translate(36px,-36px) rotateZ(8deg)}42%,100%{transform:none}}
@keyframes x5sFromR{0%{transform:translateX(416px)}24%{transform:none}34%{transform:translate(-36px,-36px) rotateZ(-8deg)}42%,100%{transform:none}}
.m25s .bp{width:16px;height:10px;border-radius:2px;opacity:0}
.m25s .bpL{animation:x5bpL 4s ease-out both}
.m25s .bpP{animation:x5bpP 4s ease-out both}
.m25s .bp.burst{animation-delay:1.2s}
.m25s .bp.burst2{animation:x5bpP 5.6s ease-out .5s both}
@keyframes x5bpL{0%,56%{transform:none;opacity:0}58%{opacity:1}76%,100%{transform:translate(var(--bx),var(--by)) rotate(220deg);opacity:0}}
@keyframes x5bpP{0%,82%{transform:none;opacity:0}84%{opacity:1}96%,100%{transform:translate(var(--bx),var(--by)) rotate(220deg);opacity:0}}
.m25s .k1{animation:x5k1 4s ease-out both}
@keyframes x5k1{0%{transform:translate(-780px,-156px) rotateZ(-6deg)}45%{transform:translate(94px,10px) rotateZ(2deg)}55%,100%{transform:translate(78px,0)}}
.m25s .k2{animation:x5k2 4s ease-in-out both}
@keyframes x5k2{0%{transform:translate(442px,135px)}12%{transform:translate(333px,114px)}24%{transform:translate(224px,140px)}36%{transform:translate(114px,114px)}46%{transform:translate(0,135px)}56%{transform:translate(0,-151px)}64%,100%{transform:translate(0,-62px)}}
.m25s .k2s{opacity:0;animation:x5k2s 4s ease-out both}
@keyframes x5k2s{0%,50%{opacity:0;transform:none}54%{opacity:1}66%,100%{opacity:0;transform:translate(var(--dx),-68px)}}
.m25s .k3{animation:x5k3 4s ease-in-out both}
@keyframes x5k3{0%,28%{transform:translate(-159px,-153px) scale(.55)}31%{transform:translate(-159px,-161px) scale(.58,.52)}40%{transform:translate(-78px,-250px) scale(.8)}52%{transform:translate(0,-16px) scale(1.04,.94)}58%{transform:none}64%{transform:translate(0,-21px)}70%,100%{transform:none}}
.m25s .k4{animation:x5k4 4s ease-out both}
@keyframes x5k4{0%{transform:translate(0,-702px)}20%{transform:translate(0,-468px) rotateZ(3deg)}40%{transform:translate(0,-208px) rotateZ(-3deg)}55%{transform:translate(0,10px) rotateZ(1deg)}62%{transform:translate(0,-10px)}70%,100%{transform:none}}
.m25s .k5{animation:x5k5 4s ease-out both}
@keyframes x5k5{0%{transform:translate(-780px,-47px)}45%{transform:translate(42px,-47px)}52%{transform:translate(-16px,-47px) rotateZ(-5deg)}60%,100%{transform:translate(0,-47px)}}
.m25s .k6{animation:x5k6 4s ease-out both}
@keyframes x5k6{0%,26%{transform:translate(0,182px) scale(.4)}30%{transform:translate(0,-52px) scale(.8)}40%{transform:translate(0,-218px) scale(1.06)}52%{transform:translate(0,-94px) scale(1.04,.92)}58%,100%{transform:translate(0,-94px)}}
.m25s .k6l{animation:x5k6l 4s ease-out both}
@keyframes x5k6l{0%,18%{transform:none}22%{transform:translate(0,-10px) rotateZ(-3deg)}26%{transform:none}34%{transform:translate(-88px,-182px) rotateZ(-40deg)}48%,100%{transform:translate(-234px,78px) rotateZ(-100deg) scale(.001)}}
.m25s .k7{animation:x5k7 4s ease-out both}
@keyframes x5k7{0%{transform:translate(-52px,-728px) rotateZ(4deg)}25%{transform:translate(36px,-494px) rotateZ(-4deg)}50%{transform:translate(-21px,-208px) rotateZ(3deg)}68%{transform:translate(0,10px)}74%,100%{transform:none}}
.m25s .k8{animation:x5k8 4s ease-out both}
@keyframes x5k8{0%{transform:translate(-130px,-754px) rotateZ(-14deg)}22%{transform:translate(78px,-520px) rotateZ(12deg)}44%{transform:translate(-42px,-260px) rotateZ(-8deg)}62%{transform:translate(10px,-16px) rotateZ(3deg)}70%,100%{transform:none}}
.m25s .k9{animation:x5k9 4s ease-out both}
@keyframes x5k9{0%{transform:translate(-676px,494px) rotateZ(-30deg)}40%{transform:translate(52px,-36px) rotateZ(-6deg)}52%{transform:translate(0,10px) rotateZ(2deg)}60%{transform:translate(0,-16px)}66%,100%{transform:none}}
.m25s .k10{animation:x5k10 4s ease-out both}
@keyframes x5k10{0%{transform:translate(780px,0)}42%{transform:translate(-21px,0)}50%{transform:translate(0,-88px) rotateZ(-10deg)}58%{transform:rotateZ(4deg)}64%,100%{transform:none}}
.m25s .k11{animation:x5k11 4s ease-out both}
@keyframes x5k11{0%,24%{transform:translate(0,156px) scale(.4)}38%{transform:translate(0,-224px) scale(1.06)}50%{transform:translate(0,-88px) scale(1.04,.92)}56%,100%{transform:translate(0,-88px)}}
.m25s .k12{animation:x5k12 4s ease-out both}
@keyframes x5k12{0%,26%{transform:translate(-130px,26px) scale(.001)}30%{transform:translate(-78px,-78px) scale(.8)}42%{transform:translate(52px,-208px) scale(1.04)}54%{transform:translate(130px,0) scale(1.06,.9)}60%,100%{transform:translate(130px,0)}}
.m25s .kclap{animation:x5kclap 4s ease-out both;transform-box:fill-box;transform-origin:0 100%}
@keyframes x5kclap{0%,8%{transform:rotate(-28deg)}17%{transform:none}19%{transform:rotate(-4deg)}21%,100%{transform:none}}
.m25s .kflash{opacity:0;animation:x5kflash 4s ease-out both;background:#fff}
@keyframes x5kflash{0%,16%{opacity:0}18%{opacity:.5}26%,100%{opacity:0}}
.m25s .kprop{animation:x5kprop .15s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes x5kprop{50%{transform:scaleY(.15)}}
.m25s .kspin{animation:x5kspin .35s linear 8;transform-box:fill-box;transform-origin:center}
@keyframes x5kspin{to{transform:rotate(360deg)}}
.m25s .kfl{animation:x5kfl .12s linear infinite;transform-box:fill-box;transform-origin:100% 50%}
@keyframes x5kfl{50%{transform:scaleX(.55)}}
.m25s .kwav{animation:x5kwav 1.6s linear infinite}
@keyframes x5kwav{to{transform:translateX(-52px)}}
.m25s .fb{border-radius:50%/45% 45% 55% 55%;background:var(--orange);border:4px solid #141414;transform-origin:0 85%;animation:x5kblow 4s ease-out both}
.m25s .fb::after{content:"";position:absolute;left:13px;top:13px;width:13px;height:21px;border-radius:50%;background:#fff;opacity:.55}
@keyframes x5kblow{0%,58%{transform:scale(0)}63%{transform:scale(.4)}66%{transform:scale(.34)}71%{transform:scale(.7)}74%{transform:scale(.64)}79%{transform:scale(1)}82%{transform:scale(1.28)}83%,100%{transform:scale(0)}}
.m25s .ptx{font-weight:800;font-size:32px;color:var(--orange);opacity:0;animation:x5kptx 4s ease-out both}
@keyframes x5kptx{0%,82%{opacity:0;transform:scale(.5)}84%{opacity:1;transform:scale(1.25)}90%,100%{opacity:1;transform:none}}
.m25s .f-vacm{animation:x5fVacM 5.6s ease-out both}
@keyframes x5fVacM{0%,30%{transform:translateX(-494px)}38%{transform:translateX(16px)}40%,66%{transform:none}71%,100%{transform:translateX(-26px) scale(.001)}}
.m25s .f-vac{animation:x5fVac 5.6s linear both}
@keyframes x5fVac{0%,40%{transform:none}41%{transform:translate(3px,-3px)}42%{transform:translate(-3px,3px)}43%{transform:translate(3px,0)}44%{transform:translate(-3px,-3px)}45%{transform:translate(3px,3px)}46%,64%{transform:translate(0,-3px)}65%{transform:none}67%{transform:scale(1.18,.86)}69%{transform:scale(.94,1.06)}71%,100%{transform:none}}
.m25s .f-ghost{animation:x5fGhost 5.6s linear both}
@keyframes x5fGhost{
  0%{transform:translateY(364px);animation-timing-function:cubic-bezier(.2,1.4,.5,1)}7%{transform:translateY(-21px) scale(1.1)}10%{transform:none;animation-timing-function:ease-in-out}
  16%{transform:translateY(-10px)}22%{transform:none}28%{transform:translateY(-10px)}34%{transform:none}
  41%{transform:translateX(13px) skewX(-8deg)}43%{transform:translateX(21px) skewX(-12deg) rotateZ(3deg)}45%{transform:translateX(10px) skewX(-6deg)}47%{transform:translateX(23px) skewX(-13deg) rotateZ(4deg);animation-timing-function:cubic-bezier(.6,0,.9,.6)}
  53%{transform:skewX(10deg) scale(.86,.95) rotateZ(-4deg)}58%{transform:skewX(18deg) scale(.62,.8) rotateZ(-10deg)}62%{transform:skewX(26deg) scale(.32,.5) rotateZ(-16deg)}
  64.5%{transform:skewX(30deg) scale(.02,.08) rotateZ(-20deg)}65%,100%{transform:scale(0)}}
.m25s .f-banw{animation:x5fBanW 5.6s linear both}
@keyframes x5fBanW{0%,47%{transform:none;animation-timing-function:cubic-bezier(.6,0,.9,.6)}56%{transform:skewX(14deg) scale(.85,.9) rotateZ(-6deg)}63%{transform:skewX(26deg) scale(.4,.55) rotateZ(-14deg)}67%{transform:scale(0) rotateZ(-30deg)}68%,100%{transform:scale(0)}}
.m25s .gban{white-space:nowrap;padding:8px 18px;background:var(--orange);color:#141414;border:4px solid #141414;border-radius:8px;transform-origin:50% 0;font-weight:800;font-size:21px;letter-spacing:.06em;background-image:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 45%,rgba(0,0,0,.18));box-shadow:0 8px 16px rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,0,0,.2)}
.m25s .f-banw .gban{animation:x5fBan 5.6s ease-out both}
@keyframes x5fBan{0%,16%{transform:scaleY(0)}21%{transform:scaleY(1.1)}24%,41%{transform:none}44%{transform:skewX(-8deg)}47%{transform:skewX(6deg)}50%{transform:skewX(-10deg)}53%,100%{transform:skewX(4deg)}}
.m25s .f-booG{font-weight:800;font-size:46px;color:var(--orange);opacity:0;animation:x5fBooG 5.6s ease-out both}
@keyframes x5fBooG{0%,4%{opacity:0;transform:scale(.3)}8%{opacity:1;transform:scale(1.4) rotate(-8deg)}12%,24%{opacity:1;transform:rotate(-8deg)}30%,100%{opacity:0}}
.m25s .f-suck{opacity:0;animation:x5fSuck 5.6s linear both}
.m25s .f-suck path{fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:8 14;animation:x5fFlow .35s linear infinite;opacity:.8}
.m25s .f-suck path:nth-child(even){stroke:var(--orange);animation-duration:.28s}
@keyframes x5fSuck{0%,41%{opacity:0}44%,63%{opacity:1}67%,100%{opacity:0}}
@keyframes x5fFlow{to{stroke-dashoffset:-22}}
.m25s .f-puff{border-radius:50%;background:#fff;opacity:0;animation:x5fPuff 5.6s ease-out both}
@keyframes x5fPuff{0%,64%{opacity:0;transform:scale(.2)}66%{opacity:.9;transform:scale(1)}72%,100%{opacity:0;transform:translate(-16px,-36px) scale(1.8)}}
.m25s .f-cakeM{animation:x5fCakeM 5.6s cubic-bezier(.3,1.3,.5,1) both}
@keyframes x5fCakeM{0%,69%{transform:translate(-104px,0) scale(.001)}72%{transform:translate(-104px,0) scale(.8)}78%{transform:translate(0,-47px)}84%,100%{transform:none}}
.m25s .f-drop{animation:x5fDrop 5.6s cubic-bezier(.3,1.2,.5,1) both}
@keyframes x5fDrop{0%{transform:translateY(-312px)}20%,46%{transform:none}56%{transform:translate(-130px,104px) scale(.7)}62%,100%{transform:translate(-156px,130px) scale(0)}}
.m25s .f-catch{animation:x5fCatch 5.6s ease-out both}
@keyframes x5fCatch{0%{transform:translateY(338px)}18%,50%{transform:none}56%{transform:translateY(-62px)}64%,100%{transform:none}}
/* ---------- flat bits kept from the 2D 小M: zzz / ? / confetti over it, the tap bits, the bunting ---------- */
.cm-brow, .cm-sweat, .cm-zzz, .cm-q, .cm-burst, .cm-conf { opacity: 0 }
.cam-svg.sleepy .cm-zzz { opacity: 1 }
.cam-svg.sleepy .cm-zzz text { animation: cmZ 3s ease-in infinite; opacity: 0 }
.cam-svg.sleepy .cm-zzz text:nth-child(2) { animation-delay: 1s }
.cam-svg.sleepy .cm-zzz text:nth-child(3) { animation-delay: 2s }
@keyframes cmZ { 0% { opacity: 0; transform: translate(0, 0) } 25% { opacity: 1 } 100% { opacity: 0; transform: translate(10px, -16px) } }
.cam-svg.cheer .cm-conf { animation: cmConf 1.6s ease-out 1 }
@keyframes cmConf { 0% { opacity: 1; transform: translate(0, 0) rotate(0) } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(260deg) } }
.cm-conf { transform-box: fill-box; transform-origin: center }
.cam-svg.shrug .cm-q { animation: cmQ 1.4s ease-out 1 }
@keyframes cmQ { 0% { opacity: 0; transform: translateY(6px) } 25%, 75% { opacity: 1; transform: none } 100% { opacity: 0 } }
.bd-stage .bunt { position: absolute; left: 0; top: 0; width: 229px; height: 26px }
.cam-svg.puzzled .cm-q { opacity: 1; animation: none }
.m-bit { position: absolute; pointer-events: none; z-index: 3 }
.m-photo { left: 50%; top: 22%; width: 34%; height: 40%; margin-left: -17%; background: #fff; border-radius: 3px; box-shadow: 0 3px 8px rgba(0, 0, 0, .3); z-index: -1;
  animation: mPhoto 2.6s cubic-bezier(.3, .7, .3, 1) both }
.m-photo i { position: absolute; left: 10%; right: 10%; top: 9%; height: 62%; background: #262626; border-radius: 1px }
.m-photo i::after { content: ""; position: absolute; left: 30%; top: 30%; width: 34%; height: 34%; border-radius: 50%; background: var(--accent); opacity: .85 }
@keyframes mPhoto { 0% { transform: translateY(40%) } 22% { transform: translateY(-82%) rotate(-3deg) } 35% { transform: translateY(-86%) rotate(4deg) }
  70% { transform: translate(60%, 70%) rotate(28deg); opacity: 1 } 100% { transform: translate(85%, 150%) rotate(46deg); opacity: 0 } }
.m-say { left: 50%; top: -14%; font: 800 13px var(--font-display); color: var(--accent); white-space: nowrap; transform: translateX(-50%) }
.m-ha { animation: mHa .76s ease-out both }
.m-choo { font-size: 17px; color: var(--fg); animation: mChoo 1s cubic-bezier(.2, .8, .3, 1) both }
@keyframes mHa { 0% { opacity: 0; transform: translate(-50%, 6px) scale(.7) } 40%, 90% { opacity: 1; transform: translate(-50%, 0) scale(1.05) } 100% { opacity: 0 } }
@keyframes mChoo { 0% { opacity: 0; transform: translate(-50%, 6px) scale(.4) } 20% { opacity: 1; transform: translate(-50%, -4px) scale(1.25) } 75% { opacity: 1; transform: translate(-50%, -10px) scale(1) } 100% { opacity: 0; transform: translate(-50%, -16px) } }
.m-star { left: 50%; top: 4%; width: 10px; height: 10px; margin: -5px 0 0 -5px; background: var(--accent); animation: mStar .9s cubic-bezier(.2, .8, .3, 1) both;
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%) }
.m-star:nth-child(even) { background: #fff }
@keyframes mStar { 0% { opacity: 0; transform: translate(0, 0) scale(.2) rotate(0) } 30% { opacity: 1; transform: translate(var(--sx), var(--sy)) scale(1.2) rotate(60deg) } 100% { opacity: 0; transform: translate(var(--sx), calc(var(--sy) - 14px)) scale(.6) rotate(140deg) } }
`;
  const me = document.currentScript; if (me) me.before(st); else document.head.append(st);

  // ---------- flat drawings the app still uses as they are: hero-card decorations, the scene bunting, festival → outfit ----------
  const OUTFIT = { newyear: ["party", ""], chapgohmei: ["cny", "lantern"], haji: ["songkok", ""], wesak: ["", "lotus"], merdeka: ["", "flag"], malaysiaday: ["", "flag"], aidilfitri: ["songkok", "ketupat"], cny: ["cny", "orange"], raya: ["songkok", "ketupat"], duanwu: ["zongzi", ""], midautumn: ["", "lantern"], halloween: ["pumpkin", ""], deepavali: ["", "diya"], dongzhi: ["", "bowl"], christmas: ["santa", ""] };
  const WEB = '<svg viewBox="0 0 56 56"><path d="M0 0 L56 56 M0 0 L28 56 M0 0 L56 28 M0 0 L4 56 M0 0 L56 4 M14 2 Q12 10 2 14 M28 3 Q22 18 3 28 M42 4 Q32 28 4 42"/></svg>';
  const BAT = '<svg viewBox="0 0 40 20"><g class="wg"><path d="M20 10 C16 2 8 2 1 6 C5 7 6 10 5 13 C9 11 12 13 13 15 C15 12 18 12 20 13 Z"/><path d="M20 10 C24 2 32 2 39 6 C35 7 34 10 35 13 C31 11 28 13 27 15 C25 12 22 12 20 13 Z"/></g><ellipse cx="20" cy="11" rx="3" ry="4"/></svg>';
  const LANT = '<svg viewBox="0 0 26 50"><path d="M13 0 V10" stroke="#a3a3a3" stroke-width="1.2"/><rect x="8" y="9" width="10" height="3" rx="1" fill="#141414"/><ellipse cx="13" cy="24" rx="12" ry="13" fill="#f48020" stroke="#141414" stroke-width="1.2"/><path d="M13 11 C6 16 6 32 13 37 M13 11 C20 16 20 32 13 37" fill="none" stroke="#141414" stroke-width="1" opacity=".45"/><rect x="8" y="36" width="10" height="3" rx="1" fill="#141414"/><path d="M11 39 V48 M13 39 V49 M15 39 V48" stroke="#f48020" stroke-width="1.2"/></svg>';
  const KETU = '<svg viewBox="0 0 26 44"><path d="M13 0 V10" stroke="#a3a3a3" stroke-width="1.2"/><path d="M13 10 L25 24 L13 38 L1 24 Z" fill="#fff" stroke="#141414" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 17 L19 31 M19 17 L7 31" stroke="#f48020" stroke-width="1.4"/><path d="M13 38 Q10 42 12 44 M13 38 Q16 42 14 44" fill="none" stroke="#fff" stroke-width="1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 26 26"><circle cx="13" cy="13" r="11" fill="#f6e7c8"/><circle cx="9" cy="10" r="2" fill="#e6d2a8"/><circle cx="16" cy="16" r="2.6" fill="#e6d2a8"/></svg>';
  const BUNT = '<svg class="bunt" viewBox="0 0 229 26" aria-hidden="true"><path d="M0 4 Q114 16 229 4" fill="none" stroke="#a3a3a3" stroke-width="1"/><path d="M5 6.4 L19 6.4 L12 18.4 Z M53 13.3 L67 13.3 L60 25.3 Z M101 16 L115 16 L108 28 Z M149 14.4 L163 14.4 L156 26.4 Z M197 8.7 L211 8.7 L204 20.7 Z" fill="#f48020"/><path d="M29 10.4 L43 10.4 L36 22.4 Z M77 15.1 L91 15.1 L84 27.1 Z M125 15.7 L139 15.7 L132 27.7 Z M173 12.1 L187 12.1 L180 24.1 Z" fill="#fff"/></svg>';

  // ---------- 2.5D model and scenes (xiaom/drafts/scenes.html) ----------
  const ORANGE='var(--orange)', SIDE='var(--orange-side)', DEEP='var(--orange-deep)';
  const W=168,H=128,D=88,R=40,STEP=2,F=D/2;
  // the app's scenes are drawn on a 229x200 card; 1 card px = 2.6 px here so 小M keeps the size it has on the other 2.5D pages
  const U=2.6, X=sx=>(sx-114)*U, Y=sy=>(sy-146)*U;
  let scene=null;
  const el=(cls,css,parent)=>{const d=document.createElement('div');d.className=cls||'';if(css)d.style.cssText=css;parent.appendChild(d);return d;};

  // ---------- extrusion helpers ----------
  const darkHex=h=>{if(h.length===3)h=h.split('').map(c=>c+c).join('');let v=[0,2,4].map(i=>Math.round(parseInt(h.substr(i,2),16)*.8));if(v.every(x=>x<48))v=[50,50,50];return '#'+v.map(x=>x.toString(16).padStart(2,'0')).join('');};
  // side slices keep only filled shapes (no outlines), shaded 20% darker; lines/strings live on the front, back and middle slice only
  const sideOf=mk=>mk.replace(/<(path|circle|ellipse|rect|text)\b[^>]*?(\/>|>[^<]*<\/text>)/g,t=>/fill="(?!none)/.test(t)&&!/^<text/.test(t)?t.replace(/\sstroke(-[a-z]+)?="[^"]*"/g,'').replace(/\sclass="[^"]*"/,''):'')
    .replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi,(_,h)=>darkHex(h));
  // the lit sheen over a front face, cut to the drawing's own shape
  const litMask=(mk,vb,w,h)=>{const u="url('data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="'+vb.join(' ')+'" overflow="visible">'+mk.replace(/var\(--[a-z-]+\)/g,'#000')+'</svg>').replace(/'/g,'%27')+"')";return '<div class="m25lit" style="-webkit-mask-image:'+u+';mask-image:'+u+'"></div>';};
  // a shade of a colour for a surface that faces the light (lit>0) or away from it (lit<0)
  const shade=(c,lit)=>lit>=0?'color-mix(in srgb, '+c+', #fff '+Math.min(40,Math.round(lit*22))+'%)':'color-mix(in srgb, '+c+', #000 '+Math.min(55,Math.round(-lit*38))+'%)';
  function extrude(parent,{mk,vb,w,h,d=6,tp=1,ox=.5,oy=.5,axis='x',sliceCss=''}){
    const n=d?Math.max(2,Math.round(d/STEP)):0, side=sideOf(mk), mid=Math.round(n/2);
    const svg=m=>'<svg width="'+w+'" height="'+h+'" viewBox="'+vb.join(' ')+'" style="position:absolute;inset:0;overflow:visible">'+m+'</svg>';
    for(let i=0;i<=n;i++){
      const zz=n?-d/2+d*i/n:0,t=n?zz/(d/2):0,k=Math.max(.04,tp+(1-tp)*Math.sqrt(Math.max(0,1-t*t)));
      const s=el('slice','left:0;top:0;width:'+w+'px;height:'+h+'px;transform-origin:'+(ox*w)+'px '+(oy*h)+'px;transform:translateZ('+zz.toFixed(1)+'px) '+(axis==='x'?'scaleX':'scaleY')+'('+k.toFixed(3)+');'+sliceCss,parent);
      s.innerHTML=svg(i===0||i===n||i===mid?mk:side)+(i===n&&d?litMask(mk,vb,w,h):'');
      if(n&&i<n&&i!==mid&&i!==0)s.style.filter='brightness('+(.72+.2*i/n).toFixed(2)+')';
    }
  }
  // a prop placed by its spot on the app's 229x200 card: at=[left,top,width(,height)]
  function prop(parent,{mk,vb,at,d=6,tp=1,z=0,ox=.5,oy=.5,axis,cls='',o=[.5,.5],delay,sh}){
    const w=at[2]*U,h=(at[3]||at[2]*vb[3]/vb[2])*U;
    const outer=el('abs','transform:translate3d('+X(at[0])+'px,'+Y(at[1])+'px,'+z+'px)',parent);
    // sh: a soft shadow on the ground under the prop (sh = how far below its bottom the ground is, in card px)
    if(sh!=null)el('m25psh','left:'+(-w*.1+w*.08)+'px;top:'+(h+sh*U-(d*.6+12))+'px;width:'+(w*1.2)+'px;height:'+(d*1.2+24)+'px;transform:rotateX(90deg)',outer);
    const g=el('abs '+cls,'transform-origin:'+(o[0]*w)+'px '+(o[1]*h)+'px 0'+(delay!=null?';animation-delay:'+delay+'s':''),outer);
    extrude(g,{mk,vb,w,h,d,tp,ox,oy,axis});
    return g;
  }
  // a flat card-space element (text, sparkles, water)
  function flat(parent,{at,z=0,cls='',css='',html=''}){
    const w=at[2]*U,h=(at[3]||at[2])*U;
    const outer=el('abs','transform:translate3d('+X(at[0])+'px,'+Y(at[1])+'px,'+z+'px)',parent);
    const f=el('flat '+cls,'left:0;top:0;width:'+w+'px;height:'+h+'px;'+css,outer);f.innerHTML=html;return f;
  }

  const S='stroke="#141414" stroke-width="1.5"';
  const paw=(x,y,z)=>({m:'<circle cx="'+x+'" cy="'+y+'" r="5" fill="#f48020" '+S+'/>',d:10,tp:0,ox:x,z});
  const HATS={
    party:{p:[{m:'<path d="M42 41 L60 2 L78 41 Z" fill="#fff" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><path d="M54.5 14 L65.5 14 L67.9 19 L52.1 19 Z M48.9 26 L71.1 26 L73.4 31 L46.6 31 Z" fill="#f48020"/><path d="M42 41 L60 2 L78 41 Z" fill="none" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><circle cx="60" cy="3" r="5.5" fill="#f48020" stroke="#141414" stroke-width="1.5"/>',d:40,tp:0}]},
    cny:{p:[{m:'<path d="M33 41 C33 24 45 17 60 17 C75 17 87 24 87 41 Z" fill="#141414"/><path d="M60 17 V41 M46 20 Q44 30 44 41 M74 20 Q76 30 76 41" fill="none" stroke="#fff" stroke-width="1" opacity=".3"/>',d:96,tp:0},{m:'<rect x="31" y="36" width="58" height="7" rx="3.5" fill="#262626"/>',d:104,tp:0},{m:'<circle cx="60" cy="14" r="5" fill="#f48020" '+S+'/>',d:10,tp:0}]},
    zongzi:{p:[{m:'<rect x="22" y="40" width="76" height="7" rx="3.5" fill="#fff"/>',d:D+8},{m:'<path d="M22 44 L12 40 M22 44 L13 50" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',d:4,z:-12},{m:'<path d="M66 33 L90 33 L78 10 Z" fill="#fff" '+S+' stroke-linejoin="round"/><path d="M70 26 L86 26 M78 10 L78 33" stroke="#141414" stroke-width="1.2" opacity=".6"/>',d:24,tp:0,ox:78}]},
    songkok:{p:[{m:'<path d="M34 42 L37 20 Q60 15 83 20 L86 42 Z" fill="#141414"/>',d:84,tp:.3}]},
    pumpkin:{p:[{m:'<path d="M60 12 C59 8 61 5 65 4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>',d:4},{m:'<ellipse cx="46" cy="28" rx="13" ry="13" fill="#f48020" stroke="#141414" stroke-width="1.8"/><ellipse cx="74" cy="28" rx="13" ry="13" fill="#f48020" stroke="#141414" stroke-width="1.8"/><ellipse cx="60" cy="27" rx="12" ry="15" fill="#f48020" stroke="#141414" stroke-width="1.8"/>',d:60,tp:0},{m:'<path d="M52 27 L56 22 L58 28 Z M62 28 L64 22 L68 27 Z" fill="#141414"/><path d="M53 33 L57 35 L60 33 L63 35 L67 33" fill="none" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/>',d:0,z:31}]},
    santa:{p:[{m:'<path d="M34 40 C38 20 54 6 74 8 C86 9 93 17 91 24 C81 20 75 27 77 40 Z" fill="#fff" '+S+' stroke-linejoin="round"/>',d:72,tp:0,ox:56},{m:'<rect x="29" y="34" width="62" height="11" rx="5.5" fill="#fff" '+S+'/>',d:100,tp:.25},{m:'<circle cx="92" cy="24" r="6" fill="#f48020" '+S+'/>',d:12,tp:0,ox:92}]},
    rat:{p:[{m:'<circle cx="30" cy="34" r="12" fill="#f48020" '+S+'/><circle cx="30" cy="34" r="6" fill="#fff"/>',d:6,z:-6,ox:30},{m:'<circle cx="90" cy="34" r="12" fill="#f48020" '+S+'/><circle cx="90" cy="34" r="6" fill="#fff"/>',d:6,z:-6,ox:90},{m:'<path d="M18 84 L30 86 M18 91 L29 90 M102 84 L90 86 M102 91 L91 90" stroke="#141414" stroke-width="1.6" stroke-linecap="round"/>',d:0,z:F+1}]},
    ox:{p:[{m:'<ellipse cx="14" cy="47" rx="9" ry="4.5" fill="#f48020" '+S+' transform="rotate(-18 14 47)"/>',d:8,ox:14},{m:'<ellipse cx="106" cy="47" rx="9" ry="4.5" fill="#f48020" '+S+' transform="rotate(18 106 47)"/>',d:8,ox:106},{m:'<path d="M38 41 C29 39 22 30 22 15 C28 24 35 29 44 33 Z" fill="#fff" '+S+' stroke-linejoin="round"/>',d:10,z:-6,tp:.3,ox:33},{m:'<path d="M82 41 C91 39 98 30 98 15 C92 24 85 29 76 33 Z" fill="#fff" '+S+' stroke-linejoin="round"/>',d:10,z:-6,tp:.3,ox:87}]},
    tiger:{p:[{m:'<path d="M25 46 C21 33 25 22 34 22 C41 22 45 31 45 40 Z" fill="#f48020"/><path d="M25 46 C21 33 25 22 34 22 C41 22 45 31 45 40" fill="none" '+S+' stroke-linecap="round"/><path d="M30 42 C28 34 30 28 34 28 C37 28 39 33 39 38 Z" fill="#fff"/>',d:8,z:-6,ox:34},{m:'<path d="M95 46 C99 33 95 22 86 22 C79 22 75 31 75 40 Z" fill="#f48020"/><path d="M95 46 C99 33 95 22 86 22 C79 22 75 31 75 40" fill="none" '+S+' stroke-linecap="round"/><path d="M90 42 C92 34 90 28 86 28 C83 28 81 33 81 38 Z" fill="#fff"/>',d:8,z:-6,ox:86},{m:'<path d="M55 40 H65 M55.5 43 H64.5 M54 46 H66 M60 40 V46" fill="none" stroke="#141414" stroke-width="1.8" stroke-linecap="round"/><path d="M18 57 L28 60 M18 65 L26 66 M18 73 L25 73 M102 57 L92 60 M102 65 L94 66 M102 73 L95 73" fill="none" stroke="#141414" stroke-width="2.4" stroke-linecap="round"/><path d="M47 93 L37 91 M47 97 L38 98 M73 93 L83 91 M73 97 L82 98" fill="none" stroke="#141414" stroke-width="1.3" stroke-linecap="round"/>',d:0,z:F+1}]},
    rabbit:{p:[{m:'<ellipse cx="45" cy="16" rx="8" ry="21" fill="#fff" '+S+' transform="rotate(-12 45 16)"/><ellipse cx="45" cy="18" rx="3.5" ry="14" fill="#f48020" transform="rotate(-12 45 18)"/>',d:10,z:-8,tp:.4,ox:45},{m:'<ellipse cx="75" cy="16" rx="8" ry="21" fill="#fff" '+S+' transform="rotate(12 75 16)"/><ellipse cx="75" cy="18" rx="3.5" ry="14" fill="#f48020" transform="rotate(12 75 18)"/>',d:10,z:-8,tp:.4,ox:75}]},
    dragon:{p:[{m:'<path d="M44 40 C40 30 38 22 34 12 M36 22 L28 18 M74 40 C80 30 82 22 86 12 M84 22 L92 18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',d:8,z:-10},{m:'<path d="M48 40 L52 30 L56 40 L60 27 L64 40 L68 30 L72 40 Z" fill="#f48020" '+S+' stroke-linejoin="round"/>',d:56,tp:.5}]},
    snake:{p:[{m:'<ellipse cx="60" cy="35" rx="23" ry="6" fill="#fff" '+S+'/>',d:92,tp:0},{m:'<ellipse cx="60" cy="28" rx="17" ry="5" fill="#f48020" '+S+'/>',d:68,tp:0},{m:'<ellipse cx="60" cy="22" rx="11" ry="4" fill="#fff" '+S+'/>',d:44,tp:0},{m:'<circle cx="64" cy="15" r="5" fill="#f48020" '+S+'/>',d:20,tp:0,ox:64},{m:'<circle cx="65.5" cy="14" r="1.2" fill="#141414"/><path d="M69 16 L74 17 M74 17 L77 15 M74 17 L77 19" stroke="#f48020" stroke-width="1.4" stroke-linecap="round"/>',d:0,z:11}]},
    horse:{p:[{m:'<path d="M36 42 L40 18 L52 38 Z" fill="#f48020" '+S+' stroke-linejoin="round"/>',d:8,z:-8,ox:42},{m:'<path d="M84 42 L80 18 L68 38 Z" fill="#f48020" '+S+' stroke-linejoin="round"/>',d:8,z:-8,ox:78},{m:'<path d="M50 40 C50 26 56 22 60 30 C62 20 72 22 70 40 Z" fill="#262626" stroke="#141414" stroke-width="1.2"/>',d:60,tp:.4}]},
    goat:{p:[{m:'<path d="M44 40 C30 40 24 30 30 22 C36 15 46 20 42 28 C40 32 34 30 35 26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',d:10,z:-8,ox:36},{m:'<path d="M76 40 C90 40 96 30 90 22 C84 15 74 20 78 28 C80 32 86 30 85 26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',d:10,z:-8,ox:84},{m:'<path d="M55 103 L60 116 L65 103 Z" fill="#fff" stroke="#141414" stroke-width="1.2" stroke-linejoin="round"/>',d:8,z:F-8,tp:.3}]},
    monkey:{p:[{m:'<circle cx="14" cy="64" r="10" fill="#f48020" '+S+'/><circle cx="14" cy="64" r="5" fill="#fff"/>',d:8,ox:14},{m:'<circle cx="106" cy="64" r="10" fill="#f48020" '+S+'/><circle cx="106" cy="64" r="5" fill="#fff"/>',d:8,ox:106},{m:'<path d="M52 39 Q56 28 60 36 Q64 26 68 39" fill="none" stroke="#141414" stroke-width="2.4" stroke-linecap="round"/>',d:4,z:F-12}]},
    rooster:{p:[{m:'<path d="M46 40 C44 30 50 26 52 32 C52 22 60 20 62 30 C64 22 72 24 70 34 C74 32 76 38 72 40 Z" fill="#f48020" '+S+' stroke-linejoin="round"/>',d:16,tp:.4},{m:'<path d="M72 99 C74 106 70 110 67 106 C66 103 68 100 72 99 Z" fill="#f48020" stroke="#141414" stroke-width="1.2"/>',d:6,z:F+3,ox:70}]},
    dog:{p:[{m:'<path d="M30 40 C14 40 8 58 14 76 C21 72 27 60 36 46 Z" fill="#fff" '+S+' stroke-linejoin="round"/>',d:10,z:6,ox:22},{m:'<path d="M90 40 C106 40 112 58 106 76 C99 72 93 60 84 46 Z" fill="#fff" '+S+' stroke-linejoin="round"/>',d:10,z:6,ox:98}]},
    pig:{mouth:0,p:[{m:'<path d="M33 42 C24 40 14 44 11 54 C20 52 28 50 40 44 Z" fill="#f48020" '+S+' stroke-linejoin="round"/><path d="M31 44 C24 44 18 47 16 51 C22 49 28 48 35 45 Z" fill="#fff" opacity=".6"/>',d:6,z:-4,ox:26},{m:'<path d="M90 43 L95 22 L73 36 Z" fill="#f48020" '+S+' stroke-linejoin="round"/><path d="M88 38 L91 28 L80 35 Z" fill="#fff" opacity=".6"/>',d:6,z:-4,ox:86},{m:'<g transform="rotate(-6 60 99)"><ellipse cx="60" cy="99" rx="15" ry="10" fill="#fff" stroke="#141414" stroke-width="1.8"/><ellipse cx="54.5" cy="99.5" rx="2.6" ry="4" fill="#141414"/><ellipse cx="65.5" cy="98.5" rx="2.2" ry="3.4" fill="#141414"/><ellipse cx="51" cy="94" rx="3" ry="1.6" fill="#f48020" opacity=".35"/></g>',d:12,z:F+6,tp:.5},{m:'<rect x="57" y="108" width="6" height="4" rx="1" fill="#fff" stroke="#141414" stroke-width="1.2"/>',d:4,z:F+2}]}
  };
  const TUFT_OK=new Set(['','zongzi','ox','rat','rabbit','goat','monkey','dog']);
  const HOLDS={
    orange:{mouth:0,p:[{m:'<circle cx="60" cy="98" r="12" fill="#f48020" stroke="#141414" stroke-width="1.8"/><path d="M60 86 Q66 80 72 84 Q66 88 60 86 Z" fill="#fff" stroke="#141414" stroke-width="1"/><circle cx="56" cy="94" r="2" fill="#fff" opacity=".5"/>',d:44,tp:0,z:F+24},paw(46,99,F+22),paw(74,99,F+22)]},
    lantern:{p:[{m:'<path d="M98 88 L110 50" stroke="#a3a3a3" stroke-width="2" stroke-linecap="round"/>',d:4,z:F+12},{m:'<path d="M110 50 V56" stroke="#a3a3a3" stroke-width="1.2"/><ellipse cx="110" cy="66" rx="9" ry="10" fill="#fff" stroke="#141414" stroke-width="1.2"/><path d="M110 56 C104 60 104 72 110 76 M110 56 C116 60 116 72 110 76" fill="none" stroke="#f48020" stroke-width="1.2"/><path d="M110 76 V84" stroke="#f48020" stroke-width="1.5" stroke-linecap="round"/>',d:34,tp:0,ox:110,z:F+12,anim:'sway',ax:110,ay:50},paw(98,90,F+12)]},
    bowl:{mouth:0,p:[{m:'<path d="M48 82 Q46 76 50 72" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',d:0,z:F+24,anim:'steam'},{m:'<path d="M72 82 Q74 76 70 72" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',d:0,z:F+24,anim:'steam',cls:'b'},{m:'<circle cx="52" cy="91" r="5" fill="#fff" stroke="#141414" stroke-width="1.2"/><circle cx="60" cy="88" r="5" fill="#f48020" stroke="#141414" stroke-width="1.2"/><circle cx="68" cy="91" r="5" fill="#fff" stroke="#141414" stroke-width="1.2"/>',d:10,z:F+24},{m:'<path d="M40 93 H80 Q78 110 60 110 Q42 110 40 93 Z" fill="#fff" stroke="#141414" stroke-width="1.8" stroke-linejoin="round"/><path d="M46 100 H74" stroke="#f48020" stroke-width="1.5"/>',d:56,tp:0,z:F+24},paw(40,99,F+22),paw(80,99,F+22)]},
    ketupat:{mouth:0,p:[{m:'<path d="M60 84 Q64 78 66 74 M60 84 Q56 78 58 72" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',d:3,z:F+16},{m:'<path d="M60 84 L74 98 L60 112 L46 98 Z" fill="#fff" stroke="#141414" stroke-width="1.8" stroke-linejoin="round"/><path d="M53 91 L67 105 M67 91 L53 105 M60 84 L60 112 M46 98 L74 98" stroke="#f48020" stroke-width="1.2"/>',d:16,tp:.4,z:F+16},paw(45,100,F+16),paw(75,100,F+16)]},
    diya:{mouth:0,p:[{m:'<path d="M60 78 C55 86 55 92 60 94 C65 92 65 86 60 78 Z" fill="#f48020" stroke="#141414" stroke-width="1"/><path d="M60 86 C58 89 58 92 60 93 C62 92 62 89 60 86 Z" fill="#fff"/>',d:10,tp:0,z:F+22,anim:'flame',ax:60,ay:94},{m:'<path d="M42 96 Q60 114 80 96 Q86 94 88 92 Q84 100 78 101 Q60 108 44 99 Z" fill="#fff" stroke="#141414" stroke-width="1.8" stroke-linejoin="round"/><path d="M48 101 Q60 106 72 101" fill="none" stroke="#f48020" stroke-width="1.5"/>',d:40,tp:0,ox:62,z:F+22},paw(43,101,F+20),paw(77,103,F+20)]},
    lotus:{mouth:0,p:[{m:'<path d="M60 82 C66 90 66 100 60 106 C54 100 54 90 60 82 Z" fill="#fff" stroke="#141414" stroke-width="1.5"/><path d="M60 82 C62 86 62 88 60 90 C58 88 58 86 60 82 Z" fill="#f48020"/>',d:14,tp:.2,z:F+26},{m:'<path d="M60 106 C50 104 43 96 43 88 C51 90 57 97 60 106 Z M60 106 C70 104 77 96 77 88 C69 90 63 97 60 106 Z" fill="#fff" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><path d="M45 90 C47 92 48 93 49 95 M75 90 C73 92 72 93 71 95" stroke="#f48020" stroke-width="1.5" stroke-linecap="round"/>',d:30,tp:0,z:F+22},{m:'<path d="M42 106 Q60 114 78 106" fill="none" stroke="#f48020" stroke-width="3" stroke-linecap="round"/>',d:24,tp:0,z:F+20},paw(45,104,F+20),paw(75,104,F+20)]},
    flag:{p:[{m:'<path d="M98 90 L104 40" stroke="#a3a3a3" stroke-width="2" stroke-linecap="round"/>',d:4,z:F+12},{m:'<g transform="translate(104 40)"><rect x="0" y="0" width="30" height="18" fill="#fff" stroke="#141414" stroke-width="1"/><rect x="0" y="0" width="30" height="1.3" fill="#cc0001"/><rect x="0" y="2.6" width="30" height="1.3" fill="#cc0001"/><rect x="0" y="5.2" width="30" height="1.3" fill="#cc0001"/><rect x="0" y="7.8" width="30" height="1.3" fill="#cc0001"/><rect x="0" y="10.4" width="30" height="1.3" fill="#cc0001"/><rect x="0" y="13" width="30" height="1.3" fill="#cc0001"/><rect x="0" y="15.6" width="30" height="1.3" fill="#cc0001"/><rect x="0" y="0" width="14" height="10" fill="#010066"/><path d="M6.5 2.2 A3 3 0 1 0 6.5 7.8 A2.4 2.4 0 1 1 6.5 2.2 Z" fill="#ffcc00"/><circle cx="9.6" cy="5" r="1.3" fill="#ffcc00"/></g>',d:2,ox:118,z:F+12,anim:'sway',ax:104,ay:40},paw(98,92,F+12)]},
    cake:{mouth:0,p:[{m:'<path d="M60 69 C56.5 74 56.5 77.5 60 79 C63.5 77.5 63.5 74 60 69 Z" fill="#f48020" stroke="#141414" stroke-width="1"/>',d:8,tp:0,z:F+24,anim:'flame',ax:60,ay:79},{m:'<rect x="58" y="79" width="4" height="13" rx="1" fill="#fff" stroke="#141414" stroke-width="1"/>',d:8,tp:0,z:F+24},{m:'<rect x="42" y="94" width="36" height="16" rx="3" fill="#fff" stroke="#141414" stroke-width="1.8"/><path d="M42 98 Q42 92 46 92 H74 Q78 92 78 98 Q74 102 70 98 Q66 103 62 98 Q58 103 54 98 Q50 103 46 98 Q44 101 42 98 Z" fill="#f48020" '+S+' stroke-linejoin="round"/>',d:56,tp:0,z:F+24},paw(41,103,F+22),paw(79,103,F+22)]}
  };
  const OUTFIT3={cny:['cny','orange'],lantern:['cny','orange'],raya:['songkok','ketupat'],duanwu:['zongzi',''],midautumn:['','lantern'],halloween:['pumpkin',''],deepavali:['','diya'],dongzhi:['','bowl'],christmas:['santa','']};

  function slab(parent,{w,h,r,depth,z=0,x=0,y=0,front,side,html,svg,lit}){
    const g=el('abs','transform:translate3d('+x+'px,'+y+'px,'+z+'px)',parent);
    const n=Math.max(2,Math.round(depth/STEP));
    for(let i=0;i<=n;i++){
      const zz=-depth/2+depth*i/n,s=el('slice','left:'+(-w/2)+'px;top:'+(-h/2)+'px;width:'+w+'px;height:'+h+'px;border-radius:'+r+';transform:translateZ('+zz+'px)',g);
      const ends=i===n||i===0;
      if(svg)s.innerHTML=svg(ends?front:side);else s.style.background=ends?front:side;
      if(i===n&&html)s.innerHTML=html;
      if(i===n&&lit)s.insertAdjacentHTML('beforeend','<div class="m25lit" style="border-radius:inherit"></div>');
    }
    return g;
  }
  function blob(parent,{x,y,z,rx,rz,hgt}){
    const g=el('abs','transform:translate3d('+x+'px,'+y+'px,'+z+'px)',parent),n=Math.round(hgt/STEP);
    for(let i=0;i<=n;i++){const t=-1+2*i/n,k=Math.sqrt(Math.max(0,1-t*t))*.85+.15,w=rx*2*k,d=rz*2*k;
      el('slice','left:'+(-w/2)+'px;top:'+(-d/2)+'px;width:'+w+'px;height:'+d+'px;border-radius:50%;background:'+shade(ORANGE,.35-.9*i/n)+';transform:translateY('+(t*hgt/2)+'px) rotateX(90deg)',g);}
  }
  const camLayer=mk=>'<svg width="260" height="260" viewBox="-5 -10 130 130" style="position:absolute;inset:0;overflow:visible">'+mk+'</svg>';
  // side-on, a stack of slices shows gaps; each outfit part also gets one plane standing across its middle, as tall as the
  // part and as deep as it, in the part's side colour, so seen from the side it is one solid piece
  const boxes = {};
  let ruler = null;
  function bboxOf(mk) {
    if (boxes[mk]) return boxes[mk];
    try {
      if (!ruler) { ruler = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ruler.setAttribute('viewBox', '-5 -10 130 130'); ruler.setAttribute('aria-hidden', 'true');
        ruler.style.cssText = 'position:fixed;left:-9999px;top:0;width:130px;height:130px;visibility:hidden;pointer-events:none'; document.documentElement.append(ruler); }
      ruler.innerHTML = mk; const b = ruler.getBBox(); ruler.innerHTML = '';
      return (boxes[mk] = b.width > 0 && b.height > 0 ? { x: b.x, y: b.y, w: b.width, h: b.height } : null);
    } catch (e) { return null; }
  }
  function sidePlane(g, mk, side, d, ox) {
    const b = bboxOf(mk), c = (side.match(/fill="(#[0-9a-f]{3,6})"/i) || [])[1];
    if (!b || !c) return;   // outline-only bits (horns, strings) stay as they are
    const cx = b.x <= ox && ox <= b.x + b.w ? ox : b.x + b.w / 2, w = d;
    el('slice', 'left:' + (2 * cx - 120 - w / 2).toFixed(1) + 'px;top:' + (2 * b.y - 140).toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;height:' + (2 * b.h).toFixed(1) +
      'px;border-radius:' + Math.min(6, w / 2, b.h).toFixed(1) + 'px;background:' + c + ';transform:rotateY(90deg)', g);
  }
  function outfitPart(parent,p){
    const {m:mk,d=6,z=0,tp=1,ox=60,anim,ax=60,ay=70,cls=''}=p;
    const outer=el('abs','transform:translateZ('+z+'px)',parent);
    const g=anim?el('abs a-'+anim+(cls?' '+cls:''),'transform-origin:'+((ax-60)*2)+'px '+((ay-70)*2)+'px 0',outer):outer;
    const n=d?Math.max(2,Math.round(d/STEP)):0,side=sideOf(mk),mid=Math.round(n/2);
    for(let i=0;i<=n;i++){
      const zz=n?-d/2+d*i/n:0,t=n?zz/(d/2):0,k=tp+(1-tp)*Math.sqrt(Math.max(0,1-t*t));
      el(d?'slice':'slice m25-decal','left:-130px;top:-160px;width:260px;height:260px;transform-origin:'+((ox+5)*2)+'px 50%;transform:translateZ('+zz.toFixed(1)+'px) scaleX('+Math.max(k,.04).toFixed(3)+')',g).innerHTML=camLayer(i===0||i===n||i===mid?mk:side)+(i===n&&d?litMask(mk,[-5,-10,130,130],260,260):'');
    }
    if(d>=8)sidePlane(g,mk,side,d,ox);
  }
  const BITS=(parent,cls,l,t,z=F+40)=>[[-30,-28,'var(--orange)'],[28,-30,'#fff'],[-38,4,'var(--orange)'],[38,2,'#fff'],[-16,-40,'var(--orange)'],[18,-42,'#fff'],[-24,24,'var(--orange)'],[26,22,'#fff']]
    .forEach(([x,y,c])=>flat(parent,{at:[l,t,6,4],z,cls:'bp '+cls,css:'--bx:'+x*U+'px;--by:'+y*U+'px;background:'+c}));

  // ---------- props (the app's own drawings, extruded) ----------
  const P={
    LANT:{vb:[0,0,26,50],mk:'<path d="M13 0 V10" stroke="#a3a3a3" stroke-width="1.2"/><rect x="8" y="9" width="10" height="3" rx="1" fill="#141414"/><ellipse cx="13" cy="24" rx="12" ry="13" fill="#f48020" stroke="#141414" stroke-width="1.2"/><path d="M13 11 C6 16 6 32 13 37 M13 11 C20 16 20 32 13 37" fill="none" stroke="#141414" stroke-width="1" opacity=".45"/><rect x="8" y="36" width="10" height="3" rx="1" fill="#141414"/><path d="M11 39 V48 M13 39 V49 M15 39 V48" stroke="#f48020" stroke-width="1.2"/>'},
    KETU:{vb:[0,0,26,44],mk:'<path d="M13 0 V10" stroke="#a3a3a3" stroke-width="1.2"/><path d="M13 10 L25 24 L13 38 L1 24 Z" fill="#fff" stroke="#141414" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 17 L19 31 M19 17 L7 31" stroke="#f48020" stroke-width="1.4"/><path d="M13 38 Q10 42 12 44 M13 38 Q16 42 14 44" fill="none" stroke="#fff" stroke-width="1.4"/>'},
    MOON:{vb:[0,0,26,26],mk:'<circle cx="13" cy="13" r="11" fill="#f6e7c8"/><circle cx="9" cy="10" r="2" fill="#e6d2a8"/><circle cx="16" cy="16" r="2.6" fill="#e6d2a8"/>'},
    BOAT:{vb:[0,-10,180,60],mk:'<path d="M8 14 C2 8 6 2 14 4 L22 16 H150 L166 6 C176 2 180 12 172 18 L160 30 C150 40 40 40 22 30 Z" fill="#f48020" stroke="#141414" stroke-width="2" stroke-linejoin="round"/><path d="M30 24 H150" stroke="#fff" stroke-width="2" stroke-dasharray="6 6"/><circle cx="14" cy="9" r="2" fill="#141414"/><path d="M120 -8 L142 34" stroke="#a3a3a3" stroke-width="3" stroke-linecap="round"/><ellipse cx="143" cy="37" rx="5" ry="8" fill="#fff" stroke="#141414" stroke-width="1.5" transform="rotate(-28 143 37)"/>'},
    CHIM:{vb:[0,0,70,70],mk:'<rect x="8" y="12" width="54" height="58" fill="#7a3b1c" stroke="#141414" stroke-width="2"/><path d="M8 26 H62 M8 40 H62 M8 54 H62 M26 12 V26 M44 26 V40 M26 40 V54 M44 54 V70" stroke="#141414" stroke-width="1.2" opacity=".55"/><rect x="2" y="2" width="66" height="12" rx="2" fill="#fff" stroke="#141414" stroke-width="2"/>'},
    DIYA:{vb:[0,0,24,22],mk:'<path class="dl" d="M12 0 C9 5 9 8 12 9 C15 8 15 5 12 0 Z" fill="#f48020"/><path d="M2 12 Q12 24 22 12 Q20 17 12 18 Q4 17 2 12 Z" fill="#fff" stroke="#141414" stroke-width="1.4" stroke-linejoin="round"/>'},
    PUMPK:{vb:[0,0,120,80],mk:'<path d="M60 10 C59 4 62 1 67 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><ellipse cx="36" cy="46" rx="30" ry="32" fill="#f48020" stroke="#141414" stroke-width="2"/><ellipse cx="84" cy="46" rx="30" ry="32" fill="#f48020" stroke="#141414" stroke-width="2"/><ellipse cx="60" cy="45" rx="27" ry="34" fill="#f48020" stroke="#141414" stroke-width="2"/><path d="M44 40 L52 30 L56 42 Z M64 42 L68 30 L76 40 Z" fill="#141414"/><path d="M42 56 L50 62 L56 57 L62 63 L68 57 L76 61" fill="none" stroke="#141414" stroke-width="2.4" stroke-linejoin="round"/>'},
    GHOST:{vb:[0,0,60,70],mk:'<path d="M30 2 C14 2 6 14 6 30 V62 L13 56 L20 63 L27 56 L34 63 L41 56 L48 63 L54 57 V30 C54 14 46 2 30 2 Z" fill="#fff" stroke="#141414" stroke-width="2" stroke-linejoin="round"/><ellipse cx="22" cy="28" rx="4" ry="6" fill="#141414"/><ellipse cx="38" cy="28" rx="4" ry="6" fill="#141414"/><ellipse cx="30" cy="42" rx="6" ry="7" fill="#141414"/>'},
    VAC:{vb:[0,0,120,60],mk:'<rect x="2" y="26" width="34" height="30" rx="10" fill="#262626" stroke="#141414" stroke-width="2"/><circle cx="12" cy="56" r="4" fill="#a3a3a3"/><circle cx="28" cy="56" r="4" fill="#a3a3a3"/><rect x="8" y="20" width="22" height="8" rx="3" fill="#f48020" stroke="#141414" stroke-width="1.5"/><path d="M34 34 C54 34 58 20 80 22" fill="none" stroke="#141414" stroke-width="5" stroke-linecap="round"/><path d="M34 34 C54 34 58 20 80 22" fill="none" stroke="#a3a3a3" stroke-width="2.5" stroke-linecap="round"/><path d="M78 16 L104 10 L106 34 L80 28 Z" fill="#f48020" stroke="#141414" stroke-width="2" stroke-linejoin="round"/>'},
    CRES:{vb:[0,0,40,40],mk:'<path d="M24 4 A16 16 0 1 0 36 30 A13 13 0 1 1 24 4 Z" fill="#f6e7c8" stroke="#141414" stroke-width="1.4"/><path d="M33 9 L34.4 12.8 L38.4 13 L35.3 15.5 L36.4 19.4 L33 17.2 L29.6 19.4 L30.7 15.5 L27.6 13 L31.6 12.8 Z" fill="#f48020" stroke="#141414" stroke-width="1"/>'},
    LOTUS:{vb:[0,0,40,26],mk:'<path d="M20 2 C26 8 26 16 20 22 C14 16 14 8 20 2 Z" fill="#fff" stroke="#141414" stroke-width="1.4"/><path d="M20 22 C12 21 5 15 4 8 C11 9 17 14 20 22 Z M20 22 C28 21 35 15 36 8 C29 9 23 14 20 22 Z" fill="#fff" stroke="#141414" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 24 Q20 28 38 24" stroke="#f48020" stroke-width="2.5" fill="none" stroke-linecap="round"/>'},
    FLAG:{vb:[0,0,40,26],mk:'<rect x="1" y="1" width="38" height="24" fill="#fff" stroke="#141414" stroke-width="1.2"/><rect x="1" y="1" width="38" height="1.7" fill="#cc0001"/><rect x="1" y="4.43" width="38" height="1.7" fill="#cc0001"/><rect x="1" y="7.86" width="38" height="1.7" fill="#cc0001"/><rect x="1" y="11.29" width="38" height="1.7" fill="#cc0001"/><rect x="1" y="14.72" width="38" height="1.7" fill="#cc0001"/><rect x="1" y="18.15" width="38" height="1.7" fill="#cc0001"/><rect x="1" y="21.58" width="38" height="1.7" fill="#cc0001"/><rect x="1" y="1" width="19" height="13.7" fill="#010066"/><path d="M9 3.5 A4 4 0 1 0 9 11.2 A3.2 3.2 0 1 1 9 3.5 Z" fill="#ffcc00"/><circle cx="13.5" cy="7.4" r="1.9" fill="#ffcc00"/>'},
    BAT:'<svg viewBox="0 0 40 20" width="100%" height="100%" fill="currentColor"><g class="wg"><path d="M20 10 C16 2 8 2 1 6 C5 7 6 10 5 13 C9 11 12 13 13 15 C15 12 18 12 20 13 Z"/><path d="M20 10 C24 2 32 2 39 6 C35 7 34 10 35 13 C31 11 28 13 27 15 C25 12 22 12 20 13 Z"/></g><ellipse cx="20" cy="11" rx="3" ry="4"/></svg>',
    BUNT:'<svg viewBox="0 0 229 26" width="100%" height="100%"><path d="M0 4 Q114 16 229 4" fill="none" stroke="#a3a3a3" stroke-width="1"/><path d="M5 6.4 L19 6.4 L12 18.4 Z M53 13.3 L67 13.3 L60 25.3 Z M101 16 L115 16 L108 28 Z M149 14.4 L163 14.4 L156 26.4 Z M197 8.7 L211 8.7 L204 20.7 Z" fill="#f48020"/><path d="M29 10.4 L43 10.4 L36 22.4 Z M77 15.1 L91 15.1 L84 27.1 Z M125 15.7 L139 15.7 L132 27.7 Z M173 12.1 L187 12.1 L180 24.1 Z" fill="#fff"/></svg>'
  };
  // ---------- festival scenes ----------
  const hang=(prp,cls)=>[[28,'',0],[176,' b',.15]].forEach(([l,b])=>prop(scene,{...prp,at:[l,-4,26],d:prp===P.LANT?40:14,tp:prp===P.LANT?0:.4,z:-60,cls:'s-hang'+b,o:[.5,0]}));
  const FEST={
    cny(){hang(P.LANT);M(scene,{hat:'cny',hold:'orange',cls:'s-bow'});BITS(scene,'bpL burst',112,70);},
    raya(){hang(P.KETU);M(scene,{hat:'songkok',hold:'ketupat',cls:'s-salam'});},
    duanwu(){
      const row=el('abs s-row','',scene);
      M(el('abs s-paddle','transform-origin:0 '+Y(184)+'px 0',row),{hat:'zongzi',top:66});
      prop(row,{...P.BOAT,at:[24,132,180,60],d:110,tp:0,axis:'y',oy:.42,z:10});
      flat(scene,{at:[-60,174,350,26],z:120,cls:'s-water',css:'background:repeating-linear-gradient(90deg,#262626 0 52px,#2e2e2e 52px 104px);border-top:5px solid #3a3a3a'});
    },
    midautumn(){
      prop(scene,{...P.MOON,at:[150,40,56],d:140,tp:0,z:-180,cls:'s-moon'});
      [[30,40],[190,120],[60,20],[120,30]].forEach(([x,y],i)=>flat(scene,{at:[x,y,4],z:-200,cls:'s-tw',css:'animation-delay:'+i*.5+'s'}));
      M(scene,{hold:'lantern',cls:'s-swayM'});
    },
    dongzhi(){M(scene,{hold:'bowl',cls:'s-bounce'});[0,1,2].forEach(i=>flat(scene,{at:[100+i*12,110,10,16],z:F+60,cls:'s-steam',css:'animation-delay:'+(1+i*.5)+'s'}));},
    christmas(){
      for(let i=0;i<14;i++)flat(scene,{at:[(i*23+7)%240-6,-8,3+i%3],z:-120+(i%5)*60,cls:'s-snow',css:'--d:'+(2.4+(i%4)*.5)+'s;--dl:'+((i*.31)%1.6)+'s'});
      M(scene,{hat:'santa',cls:'s-chim'});
      prop(scene,{...P.CHIM,at:[64,128,100],d:156,z:0});
    },
    deepavali(){
      [0,1,2,3,4].forEach(i=>prop(scene,{...P.DIYA,at:[18+i*44,174,24],d:40,tp:0,z:90,cls:'s-diya',delay:.5+i*.35}));
      flat(scene,{at:[74,30,80],z:-110,cls:'s-ring'});
      M(scene,{hold:'diya',top:64,cls:'s-rise'});
    },
    newyear(){
      ['3','2','1'].forEach((n,i)=>flat(scene,{at:[64,20,100,90],z:-40,cls:'s-count',css:'animation-delay:'+i*.8+'s',html:n}));
      [[40,30,'#f48020',2.4],[160,20,'#fff',2.7],[100,0,'#ffd166',3.1],[30,70,'#fff',3.5],[180,64,'#f48020',3.8]].forEach(([x,y,c,d])=>flat(scene,{at:[x-30,y-10,60],z:-160,cls:'s-fw',css:'--c:'+c+';--dl:'+d+'s'}));
      flat(scene,{at:[14,8,200,40],z:120,cls:'s-pop',html:'HAPPY NEW YEAR'});
      M(scene,{hat:'party',cls:'s-late'});
      BITS(scene,'bpL burst',112,80);
    },
    chapgohmei(){
      prop(scene,{...P.MOON,at:[160,22,46],d:120,tp:0,z:-180,cls:'s-moon'});
      hang(P.LANT);
      [0,1,2].forEach(i=>flat(scene,{at:[-10,150,12],z:60,cls:'s-toss',css:'--dl:'+(1+i*.7)+'s'}));
      M(scene,{hat:'cny',hold:'lantern',cls:'s-swayM'});
    },
    haji(){
      prop(scene,{...P.CRES,at:[92,4,46],d:24,tp:.3,z:-160,cls:'s-moon'});
      [[30,40],[200,110],[70,16],[120,40],[16,100]].forEach(([x,y],i)=>flat(scene,{at:[x,y,4],z:-200,cls:'s-tw',css:'animation-delay:'+i*.4+'s'}));
      hang(P.KETU);
      M(scene,{hat:'songkok',cls:'s-salam'});
    },
    wesak(){
      [[24,150],[80,166],[150,160],[200,150]].forEach(([x,y],i)=>prop(scene,{...P.LOTUS,at:[x-16,y,32],d:20,tp:0,z:100,cls:'s-diya',delay:.3+i*.3}));
      [20,60,110,160,200].forEach((x,i)=>flat(scene,{at:[x,150,10],z:-80+i*30,cls:'s-floatL',css:'--dl:'+(1+i*.45)+'s'}));
      M(scene,{hold:'lotus',top:70,cls:'s-rise'});
    },
    merdeka(label){
      flat(scene,{at:[0,-2,229,26],z:-60,cls:'s-bunt',html:P.BUNT});
      [[50,40,'#cc0001',2.6],[180,30,'#ffcc00',2.9],[110,10,'#fff',3.3]].forEach(([x,y,c,d])=>flat(scene,{at:[x-30,y-10,60],z:-160,cls:'s-fw',css:'--c:'+c+';--dl:'+d+'s'}));
      flat(scene,{at:[4,30,220,40],z:120,cls:'s-pop',html:label||'MERDEKA!'});
      M(scene,{hold:'flag',cls:'s-march'});
    },
    malaysiaday(){FEST.merdeka('HARI MALAYSIA');},
    halloween(){
      [['',30,34],[' b',60,26]].forEach(([b,t,w])=>flat(scene,{at:[0,t,w,w/2],z:-80,cls:'s-bat'+b,css:'color:var(--text)',html:P.BAT}));
      M(scene,{hat:'pumpkin',cls:'s-peek'});
      prop(scene,{...P.PUMPK,at:[54,126,120],d:150,tp:0,z:156});
      flat(scene,{at:[150,62,40,20],z:240,cls:'s-boo',html:'BOO!'});
    }
  };
  FEST.lantern=FEST.cny;
  // the calendar's festival ids (festivals.js) → scenes
  FEST.aidilfitri=FEST.raya;
  const combo=ks=>{const [a,b]=ks.map(k=>OUTFIT3[k]||['','']);M(scene,{hat:a[0],hold:a[1],left:14,cls:'s-fromL'});M(scene,{hat:b[0],hold:b[1],left:114,cls:'s-fromR'});BITS(scene,'bpL burst',112,96);};
  // ---------- birthday scenes (12, rotated in the app) ----------
  const CAKE=new Set(['01','03','05','07','09','12']);
  function bdM(parent,n,hat,o={}){
    const cake=CAKE.has(n),a=M(parent,{hat,hold:cake?'cake':'',...o});
    if(cake)BITS(a,'bpL',112,98);
    else{flat(a,{at:[116,124,28,34],z:F+40,cls:'fb'});flat(a,{at:[120,104,34,14],z:F+40,cls:'ptx',html:'POP!'});BITS(a,'bpP',128,136);}
    return a;
  }
  const gr=(cls,ox,oy)=>el('abs '+cls,'transform-origin:'+X(ox)+'px '+Y(oy)+'px 0',scene);
  const BD={
    '01'(hat){const g=gr('k1',114,160);
      flat(g,{at:[-36,160,80,22],z:0,css:'background:#f48020;border-radius:5px;display:grid;place-items:center;font-size:21px;font-weight:800;color:#141414;letter-spacing:.05em',html:'HAPPY B-DAY'});
      flat(g,{at:[44,170,6,2],css:'background:#a3a3a3'});
      bdM(g,'01',hat);
      prop(g,{vb:[0,0,150,40],at:[40,156,150],d:134,tp:0,axis:'y',oy:.62,z:0,mk:'<path d="M6 6 L22 20 L6 26 Z" fill="#f48020" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="76" cy="25" rx="64" ry="11" fill="#fff" stroke="#141414" stroke-width="1.5"/><path d="M60 27 L94 27 L80 39 L56 39 Z" fill="#f48020" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><circle cx="112" cy="23" r="3" fill="#262626"/><circle cx="122" cy="23" r="3" fill="#262626"/>'});
      prop(g,{vb:[0,0,4,28],at:[180,167,4,28],d:60,z:0,cls:'kprop',mk:'<rect width="4" height="28" rx="2" fill="#a3a3a3"/>'});},
    '02'(hat){const g=gr('k2',114,146);bdM(g,'02',hat);
      flat(scene,{at:[-60,150,350,50],z:110,css:'background:#262626',html:'<svg class="kwav" width="'+(400*U)+'" height="'+(20*U)+'" viewBox="0 0 400 20" style="position:absolute;left:0;top:'+(-8*U)+'px"><path d="'+'M0 8'+' Q5 0 10 8'+' T20 8'.repeat(1)+Array.from({length:38},(_,i)=>' T'+(30+i*10)+' 8').join('')+' V20 H0 Z" fill="#262626"/></svg>'});
      [[-18,100,138,6],[0,112,132,5],[18,124,138,6]].forEach(([dx,l,t,s])=>flat(scene,{at:[l,t,s],z:120,cls:'k2s',css:'--dx:'+dx*U+'px;border-radius:50%;background:#fff'}));},
    '03'(hat){
      flat(scene,{at:[40,6,26,22],z:-50,html:'<svg viewBox="0 0 26 22" width="100%" height="100%"><path d="M2 20 L13 3 L24 20" fill="none" stroke="#a3a3a3" stroke-width="1.5"/><circle cx="13" cy="3" r="2.5" fill="#a3a3a3"/></svg>'});
      prop(scene,{vb:[0,0,82,98],at:[12,26,82,98],d:16,z:-50,mk:'<rect x="2.5" y="2.5" width="77" height="93" fill="#262626" stroke="#fff" stroke-width="5"/><rect x="6" y="6" width="70" height="86" fill="none" stroke="#f48020" stroke-width="2"/>'});
      bdM(scene,'03',hat,{cls:'k3'});},
    '04'(hat){const g=gr('k4',114,0);
      prop(g,{vb:[0,0,100,76],at:[64,-2,100],d:220,tp:0,ox:.5,z:0,mk:'<path d="M50 74 C16 56 4 30 10 18 C18 2 82 2 90 18 C96 30 84 56 50 74 Z" fill="#f48020" stroke="#141414" stroke-width="1.5"/><path d="M50 4 C38 20 38 54 50 74 C62 54 62 20 50 4 Z" fill="#fff" stroke="#141414" stroke-width="1"/>'});
      [-76,76].forEach(z=>flat(g,{at:[0,0,229,200],z,html:'<svg viewBox="0 0 229 200" width="100%" height="100%"><path d="M96 66 L78 162 M132 66 L150 162" stroke="#a3a3a3" stroke-width="1.5"/></svg>'}));
      bdM(g,'04',hat);
      prop(g,{vb:[0,0,76,28],at:[76,162,76],d:152,z:0,mk:'<path d="M1 1 H75 V19 Q75 27 67 27 H9 Q1 27 1 19 Z" fill="#f48020" stroke="#141414" stroke-width="2"/><path d="M11 1 V27 M23 1 V27 M35 1 V27 M47 1 V27 M59 1 V27" stroke="#141414" stroke-width="2" opacity=".35"/>'});},
    '05'(hat){const g=gr('k5',114,200);bdM(g,'05',hat);
      prop(g,{vb:[0,0,130,46],at:[50,168,130],d:8,z:20,mk:'<g class="kspin"><circle cx="22" cy="30" r="14" fill="none" stroke="#fff" stroke-width="3"/><path d="M22 16 V44 M8 30 H36" stroke="#fff" stroke-width="1.2" opacity=".6"/></g><g class="kspin"><circle cx="108" cy="30" r="14" fill="none" stroke="#fff" stroke-width="3"/><path d="M108 16 V44 M94 30 H122" stroke="#fff" stroke-width="1.2" opacity=".6"/></g><path d="M22 30 L50 14 L80 30 L108 30 L102 6 L112 4" fill="none" stroke="#f48020" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'});},
    '06'(hat){bdM(scene,'06',hat,{cls:'k6'});
      prop(scene,{vb:[0,0,80,52],at:[74,148,80,52],d:200,z:0,mk:'<rect x="1" y="1" width="78" height="51" fill="#fff" stroke="#141414" stroke-width="2"/><rect x="32" y="1" width="12" height="51" fill="#f48020"/>'});
      const lid=prop(scene,{vb:[0,-14,92,30],at:[68,120,92,30],d:216,z:0,cls:'k6l',o:[.5,1],mk:'<rect x="1" y="1" width="90" height="14" rx="3" fill="#fff" stroke="#141414" stroke-width="2"/><rect x="38" y="1" width="12" height="12" fill="#f48020"/><path d="M44 0 C36 -12 28 -10 30 -4 C32 0 40 0 44 0 C48 0 56 0 58 -4 C60 -10 52 -12 44 0 Z" fill="#f48020" stroke="#141414" stroke-width="1.2"/>'});},
    '07'(hat){const g=gr('k7',114,20);
      flat(g,{at:[0,0,229,200],z:0,html:'<svg viewBox="0 0 229 200" width="100%" height="100%"><path d="M96 36 Q104 70 114 98 M116 28 Q112 64 114 98 M134 40 Q124 70 114 98" fill="none" stroke="#a3a3a3" stroke-width="1.2"/></svg>'});
      [[96,20,'#f48020',-10],[134,24,'#f48020',-6],[116,12,'#fff',-20]].forEach(([cx,cy,c,z])=>prop(g,{vb:[0,0,28,34],at:[cx-14,cy-17,28,34],d:72,tp:0,z,mk:'<ellipse cx="14" cy="17" rx="13" ry="16" fill="'+c+'" stroke="#141414" stroke-width="1.5"/>'+(c==='#fff'?'':'<ellipse cx="9" cy="11" rx="3" ry="5" fill="#fff" opacity=".45"/>')}));
      bdM(g,'07',hat);},
    '08'(hat){const g=gr('k8',114,40);
      prop(g,{vb:[54,6,120,36],at:[54,6,120,36],d:300,tp:0,z:0,mk:'<path d="M54 40 C54 4 174 4 174 40 Q159 32 144 40 Q129 32 114 40 Q99 32 84 40 Q69 32 54 40 Z" fill="#f48020" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><path d="M99 37 C99 12 129 12 129 37 Q114 30 99 37 Z" fill="#fff" stroke="#141414" stroke-width="1"/>'});
      flat(g,{at:[0,0,229,200],z:0,html:'<svg viewBox="0 0 229 200" width="100%" height="100%"><path d="M56 40 L96 104 M172 40 L132 104 M114 40 L114 96" stroke="#a3a3a3" stroke-width="1.2"/></svg>'});
      g.lastChild.style.transform=g.lastChild.style.transform.replace(',0px)',',-60px)');
      bdM(g,'08',hat);},
    '09'(hat){const g=gr('k9',114,160);bdM(g,'09',hat);
      prop(g,{vb:[0,0,160,36],at:[30,158,160],d:134,tp:0,axis:'y',z:0,mk:'<path class="kfl" d="M30 10 C16 11 4 16 0 18 C4 20 16 25 30 26 Z" fill="#f48020"/><path class="kfl" d="M30 13 C22 14 14 17 12 18 C14 19 22 22 30 23 Z" fill="#fff"/><path d="M40 6 L28 0 L52 6 Z M40 30 L28 36 L52 30 Z" fill="#f48020" stroke="#141414" stroke-width="1.2" stroke-linejoin="round"/><path d="M30 6 H128 C144 6 156 14 158 18 C156 22 144 30 128 30 H30 Z" fill="#fff" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><path d="M128 6 C144 6 156 14 158 18 C156 22 144 30 128 30 Z" fill="#f48020" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><circle cx="112" cy="18" r="5" fill="#262626" stroke="#141414" stroke-width="1.2"/>'});},
    '10'(hat){const g=gr('k10',114,200);bdM(g,'10',hat);
      prop(g,{vb:[0,0,108,20],at:[60,181,108],d:90,tp:.6,z:10,mk:'<path d="M4 4 H104 Q108 4 106 8 Q104 11 98 11 H10 Q4 11 2 8 Q0 4 4 4 Z" fill="#f48020" stroke="#141414" stroke-width="1.5"/><circle cx="24" cy="15" r="4" fill="#fff" stroke="#141414" stroke-width="1.2"/><circle cx="84" cy="15" r="4" fill="#fff" stroke="#141414" stroke-width="1.2"/>'});},
    '11'(hat){bdM(scene,'11',hat,{cls:'k11'});
      prop(scene,{vb:[0,32,112,34],at:[58,168,112,34],d:200,tp:0,z:30,mk:'<rect x="4" y="32" width="104" height="34" rx="4" fill="#fff" stroke="#141414" stroke-width="1.5"/><path d="M4 36 Q4 32 8 32 H104 Q108 32 108 36 Q100 42 92 36 Q84 42 76 36 Q68 42 60 36 Q52 42 44 36 Q36 42 28 36 Q20 42 12 36 Q8 40 4 36 Z" fill="#f48020" stroke="#141414" stroke-width="1.2"/>'});
      prop(scene,{vb:[0,-2,112,36],at:[58,134,112,36],d:130,tp:0,z:30,mk:'<rect x="22" y="14" width="68" height="20" rx="4" fill="#fff" stroke="#141414" stroke-width="1.5"/><path d="M22 18 Q22 14 26 14 H86 Q90 14 90 18 Q84 23 78 18 Q72 23 66 18 Q60 23 54 18 Q48 23 42 18 Q36 23 30 18 Q26 21 22 18 Z" fill="#f48020" stroke="#141414" stroke-width="1.2"/><rect x="38" y="4" width="4" height="10" rx="1" fill="#fff" stroke="#141414" stroke-width="1"/><rect x="54" y="4" width="4" height="10" rx="1" fill="#fff" stroke="#141414" stroke-width="1"/><rect x="70" y="4" width="4" height="10" rx="1" fill="#fff" stroke="#141414" stroke-width="1"/><path class="a-flame" d="M40 -2 C38 1 38 3 40 4 C42 3 42 1 40 -2 Z M56 -2 C54 1 54 3 56 4 C58 3 58 1 56 -2 Z M72 -2 C70 1 70 3 72 4 C74 3 74 1 72 -2 Z" fill="#f48020"/>'});},
    '12'(hat){bdM(scene,'12',hat,{cls:'k12'});
      prop(scene,{vb:[0,0,108,92],at:[14,96,108],d:14,z:40,mk:'<rect x="2" y="30" width="100" height="60" rx="4" fill="#262626" stroke="#fff" stroke-width="1.5"/><text x="52" y="66" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Century Gothic, system-ui, sans-serif">ACTION!</text><path d="M10 76 H50 M58 76 H94" stroke="#a3a3a3" stroke-width="1"/><rect x="2" y="20" width="100" height="10" fill="#fff" stroke="#141414" stroke-width="1"/><path d="M12 20 H24 L18 30 H6 Z M36 20 H48 L42 30 H30 Z M60 20 H72 L66 30 H54 Z M84 20 H96 L90 30 H78 Z" fill="#141414"/><g class="kclap"><rect x="2" y="8" width="100" height="10" fill="#fff" stroke="#141414" stroke-width="1"/><path d="M6 18 H18 L24 8 H12 Z M30 18 H42 L48 8 H36 Z M54 18 H66 L72 8 H60 Z M78 18 H90 L96 8 H84 Z" fill="#141414"/></g>'});
      flat(scene,{at:[-120,-60,470,330],z:200,cls:'kflash'});}
  };
  // ---------- per-person birthday scenes (picked by name; others use the 12 rotating ones) ----------
  const CAKE_SVG='<svg viewBox="40 66 40 46" width="100%" height="100%"><path d="M60 69 C56.5 74 56.5 77.5 60 79 C63.5 77.5 63.5 74 60 69 Z" fill="#f48020" stroke="#141414" stroke-width="1"/><rect x="58" y="79" width="4" height="13" rx="1" fill="#fff" stroke="#141414" stroke-width="1"/><defs><linearGradient id="xmCakeLit" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient></defs><rect x="42" y="94" width="36" height="16" rx="3" fill="#fff" stroke="#141414" stroke-width="1.8"/><rect x="42" y="94" width="36" height="16" rx="3" fill="url(#xmCakeLit)"/><path d="M42 98 Q42 92 46 92 H74 Q78 92 78 98 Q74 102 70 98 Q66 103 62 98 Q58 103 54 98 Q50 103 46 98 Q44 101 42 98 Z" fill="#f48020" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/><path d="M42 98 Q42 92 46 92 H74 Q78 92 78 98 Q74 102 70 98 Q66 103 62 98 Q58 103 54 98 Q50 103 46 98 Q44 101 42 98 Z" fill="url(#xmCakeLit)"/><path d="M46 95 H62" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round"/></svg>';
  const PERSON={
    // Hang：山海。远景慢慢推近舟上小M 的背影 → 转身，尴尬三条杠 + 傻笑 → 把蛋糕丢向屏幕前的你
    hang(name){
      light='l-sunset';
      flat(scene,{at:[-160,-110,550,330],z:-320,css:'background:linear-gradient(#141a2e 0%,#2b2742 42%,#7a4a4a 64%,#f48020 78%,#f6b26b 84%)'});
      flat(scene,{at:[134,84,44],z:-300,css:'border-radius:50%;background:radial-gradient(circle,#fff6e0 0 40%,#f9c784 60%,transparent 72%)'});
      const far=el('abs h-far','transform-origin:'+X(114)+'px '+Y(130)+'px 0',scene);
      flat(far,{at:[-130,60,490,80],z:-260,html:'<svg viewBox="0 0 490 80" width="100%" height="100%" preserveAspectRatio="none"><path d="M0 80 L0 52 L40 30 L70 44 L110 14 L150 40 L190 22 L240 46 L280 18 L330 42 L370 26 L420 48 L460 30 L490 40 L490 80 Z" fill="#3a3550" opacity=".85"/></svg>'});
      const mid=el('abs h-mid','transform-origin:'+X(114)+'px '+Y(140)+'px 0',scene);
      flat(mid,{at:[-110,92,450,60],z:-170,html:'<svg viewBox="0 0 450 60" width="100%" height="100%" preserveAspectRatio="none"><path d="M0 60 L0 34 L50 10 L90 30 L130 4 L175 34 L215 20 L250 40 L300 8 L345 36 L390 18 L450 38 L450 60 Z" fill="#232338"/></svg>'});
      const cam=el('abs h-cam','transform-origin:'+X(114)+'px '+Y(150)+'px 0',scene);
      flat(cam,{at:[-260,150,750,160],z:-40,cls:'h-sea',css:'background:repeating-linear-gradient(90deg,#16233a 0 60px,#1b2a44 60px 120px);border-top:3px solid #f6b26b'});
      const boat=el('abs h-boat','transform-origin:'+X(114)+'px '+Y(176)+'px 0',cam);
      prop(boat,{vb:[0,0,140,34],at:[44,166,140],d:120,tp:0,axis:'y',oy:.3,z:0,mk:'<path d="M2 6 Q8 2 14 8 L22 14 H118 L126 8 Q132 2 138 6 L128 22 Q120 32 70 32 Q20 32 12 22 Z" fill="#f48020" stroke="#141414" stroke-width="2" stroke-linejoin="round"/><path d="M20 21 H120" stroke="#fff" stroke-width="3"/>'});
      const wind=el('abs h-wind','transform-origin:'+X(114)+'px '+Y(170)+'px 0',boat);
      const a=M(wind,{cls:'h-turn',top:80});
      // embarrassed face, only seen from the front: three gloom lines, sweat drop, sheepish grin
      flat(a,{at:[90,113,16,16],z:F+46,cls:'pb-hide h-lines',html:'<svg viewBox="0 0 16 16" width="100%" height="100%"><path d="M3 1 V13 M8 1 V15 M13 1 V12" stroke="#3d5afe" stroke-width="2.2" stroke-linecap="round"/></svg>'});
      flat(a,{at:[134,118,7,10],z:F+46,cls:'pb-hide h-face',html:'<svg viewBox="0 0 8 12" width="100%" height="100%"><path d="M4 0 Q8 6 4 11 Q0 6 4 0 Z" fill="#cfe8ff" stroke="#141414" stroke-width=".8"/></svg>'});
      flat(a,{at:[104,160,20,9],z:F+46,cls:'pb-hide h-grin',html:'<svg viewBox="0 0 20 9" width="100%" height="100%"><path d="M1 1 Q10 3 19 1 Q17 8 10 8 Q3 8 1 1 Z" fill="#141414"/><path d="M3 1.8 Q10 3.6 17 1.8 L16.5 3.4 Q10 4.8 3.5 3.4 Z" fill="#fff"/></svg>'});
      flat(a,{at:[98,140,32,30],z:F+60,cls:'h-cake',html:CAKE_SVG});
      const sp=flat(scene,{at:[-10,-10,249,220],z:200,cls:'h-splat',html:'<svg viewBox="0 0 249 220" width="100%" height="100%"><path d="M10 40 Q40 0 90 22 Q120 -6 160 20 Q210 0 236 40 Q260 80 236 120 Q252 170 200 182 Q160 214 120 196 Q70 214 40 180 Q-6 160 14 112 Q-10 72 10 40 Z" fill="#fff8ef"/><g fill="#f48020"><circle cx="70" cy="70" r="9"/><circle cx="178" cy="60" r="7"/><circle cx="196" cy="150" r="10"/><circle cx="54" cy="150" r="6"/><circle cx="124" cy="44" r="5"/></g></svg>'});
      flat(sp,{at:[30,170,190,50],z:0,cls:'h-drip',css:'transform-origin:50% 0',html:'<svg viewBox="0 0 190 50" width="100%" height="100%"><path d="M10 0 V22 Q10 30 16 30 Q22 30 22 22 V0 Z M60 0 V36 Q60 44 67 44 Q74 44 74 36 V0 Z M120 0 V18 Q120 25 126 25 Q132 25 132 18 V0 Z M160 0 V30 Q160 38 166 38 Q172 38 172 30 V0 Z" fill="#fff8ef"/></svg>'});
      flat(scene,{at:[14,70,201,60],z:210,cls:'h-msg',css:'text-align:center;color:#141414;font-weight:800;line-height:1.05',html:'<div style="font-size:42px;color:#f48020">HAPPY</div><div style="font-size:30px">BIRTHDAY '+esc(String(name||'HANG').toUpperCase())+'</div>'});
    },
    // Mun：夜深人静的公园。路灯闪灭 → 鬼脸扑向镜头 → 小M 吓跳 → 吸尘器狂吸 → 爆开 → 巨型蛋糕砸下、灯亮
    mun(name){
      light='l-night';
      const w=el('abs u-shake','transform-origin:0 0 0',scene);
      flat(w,{at:[-160,-110,550,330],z:-320,css:'background:linear-gradient(#070b18 0%,#111a33 55%,#1c2540 100%)'});
      [[20,20],[60,8],[96,30],[140,12],[200,26],[34,56],[176,50],[118,4]].forEach(([x,y],i)=>flat(w,{at:[x,y,3],z:-300,cls:'s-tw',css:'animation-delay:'+i*.37+'s'}));
      flat(w,{at:[176,10,30],z:-290,css:'border-radius:50%;background:#f6e7c8;box-shadow:0 0 30px 8px rgba(246,231,200,.25)'});
      flat(w,{at:[-120,40,470,140],z:-240,html:'<svg viewBox="0 0 470 140" width="100%" height="100%" preserveAspectRatio="none"><g fill="#0c1222"><circle cx="40" cy="70" r="40"/><circle cx="90" cy="60" r="46"/><circle cx="150" cy="80" r="34"/><circle cx="330" cy="66" r="44"/><circle cx="390" cy="58" r="50"/><circle cx="450" cy="76" r="36"/><rect x="0" y="90" width="470" height="50"/></g></svg>'});
      flat(w,{at:[-120,150,470,90],z:-60,css:'background:linear-gradient(#18261c,#0f1912);border-top:2px solid #22341f'});
      flat(w,{at:[16,40,90,150],z:-50,cls:'u-lamp',css:'background:radial-gradient(ellipse 50% 70% at 50% 8%,rgba(255,214,140,.4),transparent 70%)'});
      flat(w,{at:[52,30,22,140],z:-40,html:'<svg viewBox="0 0 22 140" width="100%" height="100%"><rect x="9" y="14" width="4" height="126" fill="#2c3242"/><path d="M3 8 H19 L16 16 H6 Z" fill="#2c3242"/><circle class="u-lamp" cx="11" cy="17" r="4" fill="#ffe2a8"/></svg>'});
      prop(w,{vb:[0,0,70,30],at:[150,150,64],d:60,tp:1,axis:'y',oy:.5,z:-30,sh:0,mk:'<rect x="2" y="2" width="66" height="5" rx="2" fill="#5a3a24" stroke="#141414" stroke-width="1"/><rect x="2" y="12" width="66" height="5" rx="2" fill="#5a3a24" stroke="#141414" stroke-width="1"/><path d="M8 17 V30 M62 17 V30" stroke="#2c3242" stroke-width="3"/>'});
      prop(w,{...P.GHOST,at:[156,70,52,62],d:84,tp:0,z:-20,cls:'u-ghost',o:[.5,1]});
      const r=el('abs u-rumble','',w);
      const a=M(r,{left:30,top:84,cls:'u-me'});
      flat(a,{at:[54,112,16,16],z:F+46,cls:'u-fx',html:'<svg viewBox="0 0 16 16" width="100%" height="100%"><path d="M3 1 V13 M8 1 V15 M13 1 V12" stroke="#3d5afe" stroke-width="2.2" stroke-linecap="round"/></svg>'});
      [[100,112],[106,124]].forEach(([x,y])=>flat(a,{at:[x,y,7,10],z:F+46,cls:'u-fx',html:'<svg viewBox="0 0 8 12" width="100%" height="100%"><path d="M4 0 Q8 6 4 11 Q0 6 4 0 Z" fill="#cfe8ff" stroke="#141414" stroke-width=".8"/></svg>'}));
      flat(a,{at:[48,90,20,24],z:F+46,cls:'u-fx',css:'font-weight:900;font-size:26px;color:#fff',html:'!!'});
      flat(r,{at:[146,100,80,80],z:30,cls:'u-swirl',html:'<i></i>'});
      prop(r,{...P.VAC,at:[92,140,86],d:40,tp:.5,z:74,cls:'u-vac',o:[.2,.9]});
      flat(w,{at:[0,0,229,200],z:20,cls:'u-suck',html:'<svg viewBox="0 0 229 200" width="100%" height="100%"><path d="M206 58 Q190 110 166 152"/><path d="M226 96 Q190 128 166 152"/><path d="M150 40 Q160 100 166 152"/><path d="M200 140 Q180 148 166 152"/><path d="M230 30 Q200 90 166 152"/><path d="M120 60 Q150 110 166 152"/></svg>'});
      flat(w,{at:[120,60,100,40],z:120,cls:'u-word',html:'SHLOOP!'});
      ov.push('<div class="u-dark"></div>');
      flat(w,{at:[100,110,70],z:160,cls:'u-puff'});
      ov.push('<div class="u-flash"></div>');
      flat(w,{at:[110,96,64,74],z:175,cls:'u-cake',html:CAKE_SVG});
      ov.push('<div class="u-warm"></div>');
      // jump scare: a giant ghost face rushes at the camera
      ov.push('<div class="u-scare" style="left:5%;right:5%;top:-5%;bottom:-5%">'+'<svg viewBox="0 0 60 60" width="100%" height="100%"><path d="M30 2 C14 2 4 14 4 30 V58 L12 52 L20 58 L28 52 L36 58 L44 52 L52 58 L56 54 V30 C56 14 46 2 30 2 Z" fill="#fff" stroke="#141414" stroke-width="1.6"/><ellipse cx="20" cy="26" rx="6" ry="9" fill="#141414"/><ellipse cx="40" cy="26" rx="6" ry="9" fill="#141414"/><ellipse cx="30" cy="44" rx="8" ry="7" fill="#141414"/></svg>'+'</div>','<div class="u-booBig" style="top:30%;bottom:auto">BOO!</div>');
      BITS(w,'bp burst2',150,130,F+200);
      [[50,40,'#f48020',6.4],[180,30,'#fff',6.7],[120,16,'#ffd166',7]].forEach(([x,y,c,d])=>flat(w,{at:[x-30,y-10,60],z:120,cls:'s-fw',css:'--c:'+c+';--dl:'+d+'s'}));
      flat(w,{at:[12,6,205,26],z:200,cls:'u-ban',css:'display:flex;justify-content:center',html:'<div class="gban" style="animation:none;font-size:18px">HAPPY BIRTHDAY '+esc(String(name||'MUN').toUpperCase())+'</div>'});
    },
    // Michael：山峰云海。闪电 → 巨龙贴镜头飞过 → 小M 乘龙俯冲落地（冲击波、云爆）→ 金光中举起蛋糕 → 横幅砸下
    michael(name){
      light='l-gold';
      const dragon=(parent,big)=>{
        flat(parent,{at:[196,160,30,22],z:-10,html:'<svg viewBox="0 0 30 22" width="100%" height="100%"><path d="M2 10 Q14 2 28 2 Q22 10 28 20 Q14 18 2 12 Z" fill="#fff" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"/></svg>'});
        for(let i=0;i<8;i++)flat(parent,{at:[184-i*17,168,20,20],z:-6+i,cls:'m-seg',css:'--dl:'+(-i*.17)+'s',html:'<svg viewBox="0 -4 20 24" width="100%" height="100%"><circle cx="10" cy="10" r="9" fill="#f48020" stroke="#141414" stroke-width="1.5"/><path d="M3 13 Q10 18 17 13" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M6 2 L10 -3 L14 2" fill="#fff" stroke="#141414" stroke-width="1"/></svg>'});
        flat(parent,{at:[22,148,50,40],z:4,cls:'m-seg',css:'--dl:-1.4s',html:'<svg viewBox="-8 -6 58 48" width="100%" height="100%"><path d="M30 6 L38 -4 L36 8 M38 8 L48 2 L42 12" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M46 20 Q44 8 30 8 Q14 8 6 16 Q2 20 4 24 Q8 30 18 30 Q30 34 40 30 Q48 28 46 20 Z" fill="#f48020" stroke="#141414" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 24 Q10 26 20 25" stroke="#141414" stroke-width="1.2" fill="none"/><circle cx="24" cy="16" r="4.5" fill="#fff" stroke="#141414" stroke-width="1.2"/><circle cx="23" cy="16" r="2.2" fill="#141414"/><circle cx="7" cy="18" r="1.2" fill="#141414"/><path d="M6 26 Q-4 30 -6 38 M10 28 Q4 36 8 40" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>'+(big?'<path d="M2 22 Q-6 16 -8 20" stroke="#ffd166" stroke-width="2" fill="none"/>':'')+'</svg>'});
      };
      const w=el('abs m-shake','',scene);
      flat(w,{at:[-160,-110,550,330],z:-320,css:'background:linear-gradient(#141d36 0%,#34436d 40%,#c98b8b 70%,#f6c28b 86%)'});
      flat(w,{at:[30,40,40],z:-300,css:'border-radius:50%;background:radial-gradient(circle,#fff 0 30%,rgba(255,240,210,.6) 45%,transparent 70%)'});
      flat(w,{at:[120,-10,60,120],z:-280,cls:'m-bolt',html:'<svg viewBox="0 0 60 120" width="100%" height="100%"><path d="M34 0 L18 50 L32 50 L14 120 L48 40 L32 40 L46 0 Z" fill="#fff6c8" stroke="#fff" stroke-width="2"/></svg>'});
      flat(w,{at:[-120,30,470,140],z:-250,html:'<svg viewBox="0 0 470 140" width="100%" height="100%" preserveAspectRatio="none"><path d="M0 140 L60 60 L90 80 L150 6 L190 70 L230 40 L280 110 L330 20 L370 70 L410 50 L470 120 V140 Z" fill="#45507a"/><path d="M150 6 L165 30 L150 26 L138 34 Z M330 20 L344 42 L330 38 L318 46 Z" fill="#e8ecf6"/></svg>'});
      flat(w,{at:[-100,80,430,100],z:-170,html:'<svg viewBox="0 0 430 100" width="100%" height="100%" preserveAspectRatio="none"><path d="M0 100 L40 40 L70 60 L120 10 L160 70 L210 30 L260 90 L300 24 L350 64 L430 30 V100 Z" fill="#2c3558"/></svg>'});
      [[-60,150,180,40,-140,'16s','-200px'],[90,160,200,44,-120,'20s','-240px'],[-120,170,260,50,-60,'18s','-220px'],[60,176,240,40,20,'22s','-260px'],[-40,186,300,50,80,'24s','-300px']]
        .forEach(([l,t,w2,h,z,d,dx])=>flat(w,{at:[l,t,w2,h],z,cls:'m-cloud',css:'--d:'+d+';--dx:'+dx+';opacity:.85'}));
      // the giant flyby, right past the lens
      const fly=el('abs m-fly','',w);
      dragon(el('abs','transform:translate3d(0,'+Y(110)+'px,260px) scale3d(2.1,2.1,2.1)',fly),true);
      // landing: shockwave + cloud burst
      flat(w,{at:[64,120,100,100],z:40,cls:'m-ring'});
      [[-70,-20],[70,-26],[-90,20],[90,16],[-30,40],[40,44]].forEach(([x,y])=>flat(w,{at:[94,150,40,26],z:60,cls:'m-burst',css:'--bx:'+x*U+'px;--by:'+y*U+'px'}));
      // golden rays behind 小M
      flat(w,{at:[34,40,160,160],z:-100,cls:'m-rays',html:'<div class="m-spin" style="position:absolute;inset:0"></div>'});
      const ride=el('abs m-ride','transform-origin:'+X(114)+'px '+Y(160)+'px 0',w);
      const bob=el('abs m-bob','',ride);
      dragon(bob,false);
      const a=M(bob,{top:70});
      flat(a,{at:[98,136,32,36],z:F+56,cls:'m-cake',html:CAKE_SVG});
      [[94,136],[128,132],[112,124]].forEach(([x,y],i)=>flat(a,{at:[x,y,6],z:F+70,cls:'m-glint',css:'animation-delay:'+(i*.08)+'s'}));
      BITS(w,'bp burst2',112,110);
      [[40,40,'#ffd166',6.0],[190,30,'#fff',6.3],[110,14,'#f48020',6.6]].forEach(([x,y,c,d])=>flat(w,{at:[x-30,y-10,60],z:-60,cls:'s-fw',css:'--c:'+c+';--dl:'+d+'s'}));
      flat(w,{at:[12,10,205,26],z:160,cls:'m-ban',css:'display:flex;justify-content:center',html:'<div class="gban" style="animation:none;font-size:18px">HAPPY BIRTHDAY '+esc(String(name||'MICHAEL').toUpperCase())+'</div>'});
      ov.push('<div class="m-flash"></div>');
    }
  };

  // ---------- birthday on a festival day ----------
  function bdFest(k,hat,label){
    if(k==='halloween'){
      const vm=el('abs f-vacm','',scene);
      M(vm,{hat,left:4,top:104,size:84});
      prop(vm,{...P.VAC,at:[62,138,86],d:40,tp:.5,z:74,cls:'f-vac',o:[.15,1]});
      flat(scene,{at:[0,0,229,200],z:20,cls:'f-suck',html:'<svg viewBox="0 0 229 200" width="100%" height="100%"><path d="M206 58 Q182 108 140 152"/><path d="M216 96 Q178 122 140 152"/><path d="M196 130 Q166 142 140 152"/><path d="M168 44 Q162 102 140 152"/></svg>'});
      prop(scene,{...P.GHOST,at:[152,50,56,66],d:84,tp:0,z:0,cls:'f-ghost',o:[-13/56,103/66]});
      const bw=flat(scene,{at:[138,120,80,20],z:70,cls:'f-banw',css:'transform-origin:'+U+'px '+33*U+'px',html:'<div class="gban">HAPPY HALLOWEEN</div>'});
      flat(scene,{at:[176,26,40,20],z:90,cls:'f-booG',html:'BOO!'});
      flat(scene,{at:[132,144,14],z:90,cls:'f-puff'});
      M(scene,{hat,hold:'cake',cls:'f-cakeM'});
      BITS(scene,'bp burst2',112,96);
      return;
    }
    const PR={cny:P.LANT,lantern:P.LANT,chapgohmei:P.LANT,raya:P.KETU,aidilfitri:P.KETU,haji:P.CRES,wesak:P.LOTUS,merdeka:P.FLAG,malaysiaday:P.FLAG,midautumn:P.MOON,deepavali:P.DIYA}[k];
    const drop=el('abs f-drop','transform-origin:'+X(160)+'px '+Y(40)+'px 0',scene);
    if(PR)prop(drop,{...PR,at:[147,8,26],d:PR===P.KETU||PR===P.FLAG?14:40,tp:PR===P.KETU||PR===P.FLAG?.4:0,z:-20});
    flat(drop,{at:[110,60,100,20],z:-20,css:'display:flex;justify-content:center',html:'<div class="gban" style="animation:none">'+esc(String(label||'').toUpperCase())+'</div>'});
    M(scene,{hat,hold:'cake',cls:'f-catch'});
    BITS(scene,'bp burst2',112,96);
  }


  // ---------- 小M itself ----------
  // cm-all (whole 小M, pivots on the feet) > cm-body (breathing) > the parts. The app moves 小M through the same names the flat
  // 小M had: cm-pupil, cm-lid, cm-mouth, cm-brow, cm-sweat, cm-blush, cm-burst, cm-tuft, and the back screen's scr-heart / scr-rec / scr-num
  let uid = 0;
  // the outside wall of a rounded slab (w x h, corner radius r, depth along z), as flat strips standing round its edge
  function rim(parent, { w, h, r, depth, color, x = 0, y = 0, z = 0, n = 4 }) {
    const g = el('abs', 'transform:translate3d(' + x + 'px,' + y + 'px,' + z + 'px)', parent);
    // light from the upper left: a strip facing up-left is lit, one facing down-right is in shade
    const face = ang => { const a = ang * Math.PI / 180, l = -(Math.cos(a) * .55 + Math.sin(a) * .83); return l > 0 ? l * 1.4 : l * 1.2; };
    const strip = (cx, cy, ang, len) => el('slice', 'left:' + (-depth / 2) + 'px;top:' + (-len / 2 - .5) + 'px;width:' + depth + 'px;height:' + (len + 1) + 'px;background:' + shade(color, face(ang)) +
      ';transform:translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px) rotateZ(' + ang.toFixed(2) + 'deg) rotateY(90deg)', g);
    const sx = w / 2 - r, sy = h / 2 - r;
    if (sy > 0) { strip(w / 2, 0, 0, 2 * sy); strip(-w / 2, 0, 180, 2 * sy); }
    if (sx > 0) { strip(0, h / 2, 90, 2 * sx); strip(0, -h / 2, -90, 2 * sx); }
    [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([ax, ay], q) => {
      for (let i = 0; i < n; i++) {
        const a = (q * 90 + (i + .5) * 90 / n) * Math.PI / 180, len = 2 * r * Math.sin(Math.PI / 4 / n) * 1.04;
        strip(ax * sx + Math.cos(a) * r * Math.cos(Math.PI / 4 / n), ay * sy + Math.sin(a) * r * Math.cos(Math.PI / 4 / n), a * 180 / Math.PI, len);
      }
    });
  }
  function build(m, hat, hold) {
    blob(m, { x: -40, y: H / 2 + 12, z: 16, rx: 20, rz: 22, hgt: 20 }); blob(m, { x: 40, y: H / 2 + 12, z: 16, rx: 20, rz: 22, hgt: 20 });
    const tuft = TUFT_OK.has(hat) && el('abs cm-tuft', '', el('abs', 'transform:translate3d(-14px,' + (-H / 2 - 14) + 'px,0)', m));
    if (tuft) slab(tuft, { w: 72, h: 34, r: '0', depth: 18, front: '#f48020', side: '#cf6612',
      svg: c => '<svg width="72" height="34" viewBox="33 24 38 17"><path d="M36 40 C34 30 42 26 48 32 L52 36 L56 32 C62 26 70 30 68 40 Z" fill="' + c + '"/></svg>' });
    if (tuft) el('slice', 'left:-9px;top:-11px;width:18px;height:26px;border-radius:9px 9px 0 0;background:#cf6612;transform:rotateY(90deg)', tuft);
    slab(m, { w: 32, h: 20, r: '6px', depth: 22, x: 48, y: -H / 2 - 8, z: -6, front: '#ffffff', side: '#d9d9d9', lit: 1 }); rim(m, { w: 31, h: 19, r: 5.5, depth: 21, x: 48, y: -H / 2 - 8, z: -6, color: '#d9d9d9', n: 3 });
    el('slice cm-burst', 'left:28px;top:' + (-H / 2 - 22) + 'px;width:40px;height:28px;opacity:0;transform:translateZ(12px)', m);
    const noMouth = HATS[hat]?.mouth === 0 || HOLDS[hold]?.mouth === 0;
    const body = slab(m, { w: W, h: H, r: R + 'px', depth: D, front: 'radial-gradient(130% 120% at 24% 18%, color-mix(in srgb, ' + ORANGE + ', #fff 30%), ' + ORANGE + ' 42%, color-mix(in srgb, ' + ORANGE + ', #000 30%))', side: SIDE, lit: 1, html: '<svg width="' + W + '" height="' + H + '" viewBox="18 38 84 64" style="position:absolute;inset:0;overflow:visible">' +
      '<ellipse cx="28" cy="88" rx="4" ry="2.5" fill="#fff" opacity=".35"/><ellipse cx="92" cy="88" rx="4" ry="2.5" fill="#fff" opacity=".35"/>' +
      '<g class="cm-blush"><ellipse cx="29" cy="86" rx="8" ry="5" fill="#e5322b"/><ellipse cx="91" cy="86" rx="8" ry="5" fill="#e5322b"/></g>' +
      '<path class="cm-brow" d="M45 47 L56 42 M75 47 L64 42" stroke="#141414" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path class="cm-sweat" d="M95 50 q4 6 0 9 q-4 -3 0 -9z" fill="#fff"/>' +
      (noMouth ? '' : '<path class="cm-mouth" d="M55 96 Q60 99 65 96" fill="none" stroke="#141414" stroke-width="2.2" stroke-linecap="round"/>') + '</svg>' });
    rim(m, { w: W - 2, h: H - 2, r: R - 1, depth: D - 2, color: SIDE, n: 5 });
    const back = body.firstChild; back.style.transform += ' rotateY(180deg)';
    back.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 168 128" style="position:absolute;inset:0"><rect x="40" y="24" width="88" height="64" rx="12" fill="#141414"/>' +
      '<g transform="translate(84 58) scale(2) translate(-60 -64)"><path class="scr-heart" d="M60 72 C52 66 50 60 54 57 C57 55 59 57 60 59 C61 57 63 55 66 57 C70 60 68 66 60 72 Z" fill="#f48020"/></g>' +
      '<g class="scr-rec"><circle cx="62" cy="56" r="6" fill="#f48020"/><text x="74" y="63" font-size="20" font-weight="800" fill="#fff" font-family="Century Gothic,system-ui,sans-serif">REC</text></g>' +
      '<text class="scr-num" x="84" y="68" text-anchor="middle" font-size="30" font-weight="800" fill="#fff" font-family="Century Gothic,system-ui,sans-serif"></text></svg>';
    slab(m, { w: 104, h: 104, r: '50%', depth: 6, z: F + 3, front: 'linear-gradient(135deg, color-mix(in srgb, ' + DEEP + ', #fff 22%), ' + DEEP + ' 50%, color-mix(in srgb, ' + DEEP + ', #000 35%))', side: DEEP }); rim(m, { w: 103, h: 103, r: 51.5, depth: 5, z: F + 3, color: DEEP, n: 6 });
    rim(m, { w: 91, h: 91, r: 45.5, depth: 15, z: F + 8, color: '#dcdcdc', n: 6 });
    const id = 'm25c' + (++uid);
    slab(m, { w: 92, h: 92, r: '50%', depth: 16, z: F + 8, front: '#ffffff', side: '#dcdcdc', html: '<svg width="92" height="92" viewBox="37 47 46 46" style="position:absolute;inset:0;overflow:visible"><defs><clipPath id="' + id + '"><circle cx="60" cy="70" r="23"/></clipPath>' +
      '<radialGradient id="' + id + 'w" cx=".4" cy=".35" r=".7"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#c9c9c9"/></radialGradient>' +
      '<radialGradient id="' + id + 'p" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#3a3a3a"/><stop offset=".7" stop-color="#141414"/><stop offset="1" stop-color="#000"/></radialGradient></defs>' +
      '<circle cx="60" cy="70" r="23" fill="url(#' + id + 'w)"/><circle cx="60" cy="70" r="22" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="2"/>' +
      '<path d="M41 76 A20 20 0 0 1 66 50.8" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="5" stroke-linecap="round"/>' +
      '<g class="cm-pupil"><circle cx="60" cy="70" r="12" fill="url(#' + id + 'p)"/><circle cx="64" cy="65" r="3.5" fill="#fff"/><circle cx="56.5" cy="74" r="1.5" fill="#fff"/></g>' +
      '<path d="M44 60 A18 18 0 0 1 58 50" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>' +
      '<rect class="cm-lid" x="36" y="46" width="48" height="48" fill="#f48020" clip-path="url(#' + id + ')"/></svg>' });
    (HATS[hat]?.p || []).forEach(p => outfitPart(m, p)); (HOLDS[hold]?.p || []).forEach(p => outfitPart(m, p));
  }
  // a 小M placed where the app's flat scenes put their 100x100 ".mc" box (left / top on the card), with a choreography class
  function M(parent, { hat = '', hold = '', left = 64, top = 84, size = 100, cls = '', delay }) {
    const s = size / 100, cx = left + size * .5, cy = top + size * .615;
    const pos = el('abs', 'transform:translate3d(' + X(cx) + 'px,' + Y(cy) + 'px,0) scale3d(' + s + ',' + s + ',' + s + ')', parent);
    const act = el('abs ' + cls, 'transform-origin:0 99px 0' + (delay != null ? ';animation-delay:' + delay + 's' : ''), pos);
    el('m25sh', '', act); el('m25sh2', '', act);
    build(el('abs cm-body', '', el('abs cm-all', '', act)), hat, hold);
    return act;
  }

  // ---------- what the app calls ----------
  const conf = [[-30, -28, "#f48020"], [28, -30, "#fff"], [-38, 4, "#fff"], [38, 2, "#f48020"], [-16, -40, "#fff"], [18, -42, "#f48020"]]
    .map(([dx, dy, c]) => `<rect class="cm-conf" x="58" y="40" width="5" height="3" rx="1" fill="${c}" style="--dx:${dx}px;--dy:${dy}px"/>`).join("");
  const OVER = `<svg class="m25o" viewBox="-5 -10 130 130" aria-hidden="true">${conf}
      <g class="cm-zzz" fill="var(--muted)" font-weight="800" font-family="var(--font-display)"><text x="96" y="30" font-size="12">z</text><text x="104" y="20" font-size="10">z</text><text x="110" y="10" font-size="8">z</text></g>
      <text class="cm-q" x="98" y="34" font-size="22" font-weight="800" fill="var(--accent)" font-family="var(--font-display)">?</text></svg>`;
  function camSVG(hat = "", hold = "", label = "Studio M mascot", back = false) {
    const root = document.createElement("div");
    root.className = "cam-svg m25s m25" + (back ? " cam-back" : ""); root.setAttribute("role", "img"); root.setAttribute("aria-label", label);
    const w = el("abs m25w", "", el("m25v", "", root));
    el("m25sh", "", w); el("m25sh2", "", w);
    build(el("abs cm-body", "", el("abs cm-all", "", el("abs m25r", "", el("abs m25t", "", w)))), hat, hold);
    return root.outerHTML.replace(/<\/div>$/, OVER + "</div>");
  }
  const camBackSVG = (hat = "", label = "M, seen from behind") => camSVG(hat, "", label, true);
  // turning round with the card: 小M hops and turns a real half turn on its feet; swap() repaints it facing the other way
  // at the edge-on moment, and the new one finishes the turn. Returns the timer, so the app can cancel it.
  function turn(btn, swap) {
    const r = btn.querySelector(".m25r");
    if (!r || !r.animate) { swap(); return 0; }
    btn.classList.remove("m25-edge"); setTimeout(() => btn.classList.add("m25-edge"), 170);
    r.animate([{ transform: "none" }, { transform: "translateY(-30px) scale3d(1.04, .97, 1.04)", offset: .45 }, { transform: "translateY(-43px) rotateY(90deg)" }], { duration: 280, easing: "cubic-bezier(.5, 0, .9, .4)", fill: "forwards" });
    return setTimeout(() => {
      swap();
      const n = btn.querySelector(".m25r");
      if (n && n.animate) n.animate([{ transform: "translateY(-43px) rotateY(-90deg)" }, { transform: "translateY(6px) scale3d(1.08, .92, 1.08)", offset: .72 }, { transform: "none" }], { duration: 380, easing: "cubic-bezier(.1, .6, .3, 1)" });
      setTimeout(() => btn.classList.remove("m25-edge"), 110);
    }, 280);
  }
  // ov: full-card 2D layers (flashes, blackouts, jump scares) kept outside the 3D world so no 3D plane can cut through them
  let ov = null, light = '';
  function stage(fn) {
    scene = document.createElement("div"); scene.className = "abs"; ov = []; light = '';
    try { fn(); return `<div class="m25s m25-scene"><div class="m25sw">${scene.outerHTML}</div></div>` + `<div class="m25-light${light ? ' ' + light : ''}"></div>` + (ov.length ? `<div class="m25s m25-ov">${ov.join("")}</div>` : ""); } finally { scene = null; ov = null; }
  }

  // browsers without tan(atan2()) in CSS: size each 小M to its box from here
  if (!(window.CSS && CSS.supports("width", "calc(1px * tan(atan2(1px, 1px)))")) && window.ResizeObserver) {
    const seen = new WeakSet(), ro = new ResizeObserver(es => es.forEach(e => { const v = e.target.querySelector(".m25v"); if (v && e.contentRect.width) v.style.setProperty("--k", (e.contentRect.width / 260).toFixed(4)); }));
    new MutationObserver(() => document.querySelectorAll(".m25").forEach(n => { if (!seen.has(n)) { seen.add(n); ro.observe(n); } })).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.camSVG = camSVG; window.camBackSVG = camBackSVG;
  window.XiaoM = { camSVG, camBackSVG, turn, OUTFIT, WEB, BAT, LANT, KETU, MOON, BUNT,
    actHtml: (n, hat) => stage(() => (BD[n] || BD["12"])(hat)),
    FESTS: Object.keys(FEST),
    PEOPLE: Object.keys(PERSON),
    personAct: (key, name) => stage(() => PERSON[key](name)),
    festAct: k => stage(() => (FEST[k] || FEST.halloween)()),
    comboAct: ks => stage(() => combo(ks)),
    bdFestAct: (k, hat, label = "") => stage(() => bdFest(k, hat, label)) };
})();
