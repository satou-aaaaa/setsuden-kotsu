// SNS に貼ったときの絵 og.png（1200×630）を作る。今日の問題（答え）は入れない。見本は金額を伏せた2枚のカードだけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const card = (l, g, t) => `<div style="background:#fff;border:3px solid #4c5a50;border-radius:18px;padding:20px 26px;box-shadow:0 6px 0 #c8d3c4;display:flex;flex-direction:column;gap:8px"><div style="font-size:24px;color:#4c5a50"><span style="display:inline-block;background:#1d2a22;color:#fff;border-radius:8px;padding:0 10px;margin-right:10px">${l}</span>${g}</div><div style="font-size:38px;font-weight:800">${t}</div><div style="font-size:28px;color:#8a5a00;font-weight:800">1年で 約？？？円</div></div>`;
  await p.setContent(`<body style="margin:0;width:1200px;height:630px;background:#eef3ec;font-family:'Noto Sans CJK JP',sans-serif;color:#1d2a22;display:flex;align-items:center;justify-content:center;gap:60px">
    <div style="width:600px;display:flex;flex-direction:column;gap:16px">${card("A", "冷暖房", "冷房の温度を1℃上げる")}<div style="text-align:center;font-size:30px;font-weight:800;color:#4c5a50">どっち？</div>${card("B", "キッチン", "冷蔵庫を壁から離して置く")}</div>
    <div style="display:flex;flex-direction:column;gap:18px"><div style="font-size:84px;font-weight:800;letter-spacing:8px"><span style="background:#f2c94c;border-radius:14px;padding:0 10px">⚡</span><br>節電の<br>コツ</div><div style="font-size:30px;color:#4c5a50">1年で得なのはどっち？<br>だれでも同じ1日5問</div></div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
