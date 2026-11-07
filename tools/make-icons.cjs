// アプリのアイコン（icon-192.png・icon-512.png・icon-512-maskable.png）を作る。maskable は絵を中心から0.75倍にして、丸く切られても欠けないようにする（安全な範囲は中心の直径80%）。うすい緑の地に、電球と、いなずまの印。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [s, name, k] of [[192, "icon-192.png", 1], [512, "icon-512.png", 1], [512, "icon-512-maskable.png", 0.75]]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#1f6b4a"/><g transform="translate(50 50) scale(${k}) translate(-50 -50)">
      <circle cx="50" cy="42" r="24" fill="#f2c94c" stroke="#fff" stroke-width="3"/>
      <rect x="39" y="64" width="22" height="7" rx="2" fill="#fff"/><rect x="41" y="73" width="18" height="6" rx="2" fill="#fff"/><rect x="45" y="81" width="10" height="5" rx="2" fill="#fff"/>
      <path d="M53 26 L41 45 L50 45 L46 58 L60 38 L51 38 Z" fill="#1d2a22"/>
      </g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", name), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
