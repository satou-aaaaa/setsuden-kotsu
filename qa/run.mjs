// 節電のコツの検査。工夫のデータの形と出典・今日の5問と上級の組み方（3年分・過去の日が変わらない）・とことんと練習の問題（何百回）・通しで遊ぶ・ヒント・はずれ・続きから・上級・練習・あとから・実績・コツ帳・記録の読み合わせ・スマホ幅・PWA・引き継ぎ・見やすさ。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";
import { checkSwStall } from "./sw-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 500) });
const G = createRequire(import.meta.url)(path.join(root, "game.js"));
const html = readFileSync(path.join(root, "index.html"), "utf8");
const gameSrc = readFileSync(path.join(root, "game.js"), "utf8");
const dataSrc = readFileSync(path.join(root, "data.js"), "utf8");
const KEY = "setsuden-kotsu-v1"; // gitleaks:allow 記録の名前（鍵ではない）
const day = (n) => new Date(Date.parse(G.EPOCH) + n * 864e5).toISOString().slice(0, 10);
const T = G.TIPS;

// 1. 工夫のデータ（ブラウザを使わない）
{
  const bad = [];
  for (const t of T) {
    if (!t.a || t.a.length > 26) bad.push("工夫:" + t.a);
    if (!t.c || t.c.length > 60) bad.push("条件:" + t.a);
    if (!Number.isInteger(t.y) || t.y < 10 || t.y > 10000) bad.push("円:" + t.a);
    if (!t.e || !/kWh|m3|m³|L|円/.test(t.e)) bad.push("へる量:" + t.a);
    if (!t.w || t.w.length > 40) bad.push("教え:" + t.a);
    if (!G.GROUPS.includes(t.g) || !/^https:\/\/www\.enecho\.meti\.go\.jp\/category\/saving_and_new\/saving\/general\/howto\/[a-z]+\/index\.html$/.test(t.src)) bad.push("出典:" + t.a);
  }
  check("工夫のデータの形（工夫26字以内・条件60字以内・1年の円・へる量・教え40字以内・資源エネルギー庁のページ）", bad.length === 0, bad.slice(0, 5).join(" / "));
  check("同じ見出しの工夫が二つ無い", new Set(T.map((t) => t.a)).size === T.length);
  check("工夫は40以上・なかまは4つ", T.length >= 40 && G.GROUPS.length === 4, T.length);
  check("番号（id）は0から順に並ぶ（今日の問題の番号。足すのは最後だけ）", T.every((t, i) => t.id === i));
  // 出典の数字（2026-11-07 に資源エネルギー庁のページで確かめた値。/mnt/project-files/games/setsuden-research.md）
  const want = { "冷房の温度を1℃上げる": 270, "白熱電球をLED電球に": 2880, "手洗いをやめて食器洗い乾燥機でまとめ洗い": 6790 };
  const got = Object.keys(want).filter((a) => T.some((t) => t.a === a));
  check("出典の数字が書き写したまま（冷房1℃ 270円など）", got.length === 3 && got.every((a) => T.find((t) => t.a === a).y === want[a]), got.join(","));
  check("計算の前提（電気31円/kWh など）を画面に出す", /31円\/kWh/.test(G.PRICE) && /id="price"/.test(html));
}
// 2. 今日の5問・上級（3年分）
{
  const bad = [];
  let over = 0;
  for (let n = 0; n < 365 * 3; n++) {
    const k = day(n), d = G.dailyList(k), h = G.hardList(k), di = d.flatMap(G.idsOf), hi = h.flatMap(G.idsOf);
    if (d.length !== 5 || h.length !== 3) bad.push(k + ":数");
    if (d.map((q) => q.k).join() !== G.KINDS.join() || h.some((q) => q.k !== "m")) bad.push(k + ":形");
    if (new Set(di).size !== di.length) bad.push(k + ":今日の中で同じ工夫");
    if (hi.some((t) => di.includes(t)) || new Set(hi).size !== hi.length) bad.push(k + ":上級の重なり");
    if (d.concat(h).some((q) => !G.valid(q) || G.idsOf(q).some((t) => t > G.DAILY_MAX_ID))) bad.push(k + ":こわれた問題");
    d.forEach((q, j) => { if (q.k === "p") { const r = G.ratio(T[q.a].y, T[q.b].y); if (r < G.RATIO[j]) bad.push(k + ":差が小さい" + j); if (G.RATIO_HI[j] && r > G.RATIO_HI[j] * 2) over++; } });
    h.forEach((q) => { const ys = q.ts.map((t) => T[t].y).sort((a, b) => b - a); if (ys[0] < ys[1] * 1.25) bad.push(k + ":上級の差"); });
    d.filter((q) => q.k === "y").forEach((q) => { const y = T[q.t].y; if (q.o.some((v) => v !== y && G.ratio(v, y) < 1.6)) bad.push(k + ":選び肢が近い"); });
  }
  check("今日の5問は どっち・いくら・どっち・いくら・どっち、上級は3つから選ぶ×3、同じ工夫を重ねない・差は3倍→2倍→1.4倍以上・上級は1.25倍以上・金額の選び肢は1.6倍以上ちがう（3年分）", bad.length === 0, bad.slice(0, 5).join(","));
  check("5問目の差が上限の2倍を超える日はわずか（3年で20日まで）", over <= 20, over);
  const seen = new Set(); for (let n = 0; n < 30; n++) G.dailyList(day(n)).forEach((q) => seen.add(G.idsOf(q)[0]));
  check("30日で今日の問題にほとんどの工夫が出る（35以上）", seen.size >= 35, seen.size);
  { let err = ""; try { for (const k of ["2026-11-06", "2026-10-01", "2025-01-01"]) { G.dailyList(k); G.hardList(k); if (G.dayNo(k) !== 1) err = k + " #" + G.dayNo(k); } } catch (e) { err = e.message; } check("時計が第1回より前にずれていても今日の問題が作れる（番号は #1）", !err, err); }
  const snap = createHash("sha256").update(JSON.stringify([...Array(120)].map((_, n) => [G.dailyList(day(n)), G.hardList(day(n))]))).digest("hex").slice(0, 16);
  check("はじめの120日の今日の5問・上級は前と同じ（変えると過去の日の問題が変わる）", snap === "cb9c729e40cee689", snap);
  check("乱数は sort の比較の中で引かない", !/sort\([^)]*r\(\)/.test(gameSrc + html));
  check("Math.random は練習・とことんの並びと回の名札だけ（game.js には無い・index.html に5か所）", !/Math\.random/.test(gameSrc + dataSrc) && (html.match(/Math\.random/g) || []).length === 5, (html.match(/Math\.random/g) || []).length);
}
// 3. とことん・練習（何百回）
{
  const bad = [];
  for (let t = 0; t < 400; t++) {
    const r = G.rng(G.seedOf("qa-e:" + t)), avoid = t % 3 ? t % T.length : undefined, from = (t % 4) * 9, L = G.endlessList(r, avoid, from);
    if (L.length !== T.length) { bad.push(t + ":数"); continue; }
    if (L.some((q, j) => j && JSON.stringify(q) === JSON.stringify(L[j - 1]))) bad.push(t + ":続けて同じ問題");
    if (new Set(L.filter((q) => q.k === "y").map((q) => q.t)).size !== L.filter((q) => q.k === "y").length) bad.push(t + ":同じ工夫の金額を2回");
    if (avoid !== undefined && G.idsOf(L[0]).includes(avoid) && L[0].k === "y") bad.push(t + ":つなぎ目");
    L.forEach((q, j) => { if (!G.valid(q)) bad.push(t + ":" + j); });
  }
  check("とことん：工夫の数だけ問題・続けて同じ問題を出さない・同じ工夫の金額を2回聞かない・こわれた問題を作らない（400回）", bad.length === 0, bad.slice(0, 5).join(","));
  const pb = [];
  for (let t = 0; t < 300; t++) { const g = t % 5 === 4 ? "" : G.GROUPS[t % 4], L = G.practiceList(G.rng(G.seedOf("qa-p:" + t)), g); if (L.length !== 5 || L.some((q) => !G.valid(q))) pb.push(t); }
  check("練習：なかまごとに5問・こわれた問題を作らない（300回）", pb.length === 0, pb.slice(0, 5).join(","));
  { const L = G.practiceList(G.rng(1), T[7].g, 7); check("練習：コツ帳から選んだ工夫が1問目に出る", G.idsOf(L[0]).includes(7)); }
  check("こわれた問題は使わない（valid）", !G.valid({ k: "p", a: 0, b: 0 }) && !G.valid({ k: "p", a: 0, b: 99 }) && !G.valid({ k: "y", t: 0, o: [1, 2, 3] }) && !G.valid({ k: "y", t: 0, o: [T[0].y, T[0].y, 5] }) && !G.valid({ k: "m", ts: [0, 1] }) && !G.valid({ k: "x" }) && !G.valid({ k: "p", a: "0", b: 1 }));
  check("★：はずれで★1・ヒントで当てると★2・そのまま当てると★3", G.starsOf({ m: 0, h: 0 }) === 3 && G.starsOf({ m: 0, h: 1 }) === 2 && G.starsOf({ m: 1, h: 0 }) === 1 && G.starsOf({ m: 1, h: 1 }) === 1);
}
// 4. 決まりの言葉（好きなだけ遊べる・お笑いを入れない・外へ送らない）
{
  const vis = html.replace(/<!-- a11y:begin[\s\S]*?<!-- a11y:end -->/, "");
  check("チケット・回数制限・🔒で開くモードが無い（game-dev.md F1・F2）", !/🎫|チケット|すると開く|🔒|スタミナ|あと\d+回/.test(vis));
  check("お笑いの言葉を入れない（本物っぽさ優先）", !/（笑）|ツッコミ|ボケ|爆笑|w{3}(?!\.)/.test(vis + dataSrc));
  check("外へ通信しない（CSP の connect-src は 'self' だけ・fetch を使わない）", /connect-src 'self';/.test(html) && !/fetch\(|XMLHttpRequest|sendBeacon/.test(vis + gameSrc));
  check("Ko-fi はただのリンクだけ（スクリプトを入れない）", !/ko-fi\.com\/widgets|<script[^>]+ko-fi/i.test(html));
  check("金額は「目安」と書き、計算の前提と出典を出す（遊び方・結果）", /目安/.test(vis) && /資源エネルギー庁/.test(vis) && /enecho\.meti\.go\.jp/.test(vis));
  const sw = readFileSync(path.join(root, "sw.js"), "utf8"), shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  { const st = await checkSwStall(sw); check("PWA：本文の途中で通信が止まっても4秒で保存したものを返す・ふつうはネットの返事", st.ok, JSON.stringify(st)); }
  check("PWA：sw.js の SHELL に画面のファイルが全部ある・取り直して保存する（cache: reload）", ["./", "./index.html", "./data.js", "./game.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"].every((f) => shell.includes(f)) && shell.filter((f) => f !== "./").every((f) => existsSync(path.join(root, f))) && /cache: "reload"/.test(sw) && /CACHE = "setsuden-kotsu-/.test(sw));
  const mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  check("PWA：manifest の名前・アイコン（192・512・maskable）", mf.name === "節電のコツ" && mf.icons.length === 3 && mf.icons.some((i) => i.purpose === "maskable"));
  check("記録の名前の行に gitleaks:allow がある", html.split("\n").concat(readFileSync(path.join(root, "qa/run.mjs"), "utf8").split("\n")).filter((l) => l.includes(KEY) && !l.includes("filter((l) => l.includes(KEY)")).every((l) => /gitleaks:allow/.test(l)));
}

// 5. ブラウザで遊ぶ
let browser;
const errors = [];
async function newPage(opt = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, locale: "ja-JP" }, opt));
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|ERR_|net::/.test(m.text())) errors.push(m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(url);
  return p;
}
const closeHow = (p) => p.evaluate(() => { const d = document.getElementById("howto"); if (d.open) document.getElementById("howto-ok").click(); });
const cur = (p) => p.evaluate(() => { const c = window.__sk.cur(); return c && { q: c.q, h: c.h, done: c.done, mode: c.mode, i: c.i, ans: window.__sk.answer() }; });
async function answer(p, right = true) { const c = await cur(p); const n = c.q.k === "y" ? 3 : c.q.k === "p" ? 2 : 3; let j = c.ans; if (!right) { for (let x = 0; x < n; x++) if (x !== c.ans && !(await p.locator(`#board button[data-j="${x}"]`).isDisabled())) { j = x; break; } } await p.click(`#board button[data-j="${j}"]`); await p.waitForSelector("#next"); }
try {
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await newPage();
  check("はじめて開くと遊び方が出る（計算の前提つき）", await page.evaluate(() => document.getElementById("howto").open && /31円\/kWh/.test(document.getElementById("howto").textContent)));
  { const p0 = await newPage(); let bad = 0;
    for (let j = 0; j < 10; j++) { await p0.evaluate((K) => localStorage.removeItem(K), KEY); await p0.reload(); await p0.keyboard.press("Escape"); if (await p0.evaluate((K) => !(JSON.parse(localStorage.getItem(K) || "{}").tut), KEY)) bad++; await p0.reload(); if (await p0.evaluate(() => document.getElementById("howto").open)) bad++; }
    await p0.evaluate((K) => localStorage.removeItem(K), KEY); await p0.reload(); await p0.click("#howto-ok");
    const atOnce = await p0.evaluate((K) => !!(JSON.parse(localStorage.getItem(K) || "{}").tut), KEY);
    check("遊び方：Esc で閉じても「見た」が残り、すぐ読み直しても出ない（10回）・「わかった」を押したその場で残る", bad === 0 && atOnce, bad);
    await p0.close(); }
  await closeHow(page);
  check("ホーム：今日の5問・とことん・上級・練習・コツ帳・実績・カレンダーのボタンが最初から押せる", await page.evaluate(() => ["go-d", "go-e", "go-h", "go-p", "go-dex", "go-ach", "go-cal"].every((id) => { const b = document.getElementById(id); return b && !b.disabled; })));
  { const ctx = await browser.newContext(); const p2 = await ctx.newPage(); await p2.goto(url); const d2 = await p2.evaluate(() => JSON.stringify(window.SKG.dailyList("2026-12-24"))); await ctx.close(); check("同じ日は別のブラウザで開いても同じ5問", d2 === JSON.stringify(G.dailyList("2026-12-24"))); }
  await page.click("#go-d");
  const k = await page.evaluate(() => window.__sk.todayKey());
  let c = await cur(page);
  check("1問目「どっちが得？」：カード2枚（金額は出さない）・ヒント", c.q.k === "p" && JSON.stringify(c.q) === JSON.stringify(G.dailyList(k)[0]) && (await page.locator("#board button.tip").count()) === 2 && (await page.locator("#board .yy").count()) === 0 && !!(await page.$("#hint")));
  await page.click("#hint"); await page.waitForTimeout(80);
  check("ヒント（どっち）：Aの金額だけ出る・ヒントは1回まで", (await page.locator("#board .yy").count()) === 1 && (await page.locator("#hint").isDisabled()) && /ヒント/.test(await page.textContent("#live")));
  await answer(page, true);
  check("当てると「✓ 正解」・両方の金額と棒・なぜ・出典のリンク・★2（ヒント）", await page.evaluate(() => { const v = document.querySelector(".verdict"); return v.textContent.includes("✓ 正解") && v.querySelectorAll(".bars li").length === 2 && /なぜ？/.test(v.textContent) && !!v.querySelector('a[href^="https://www.enecho.meti.go.jp/"]') && v.querySelector(".stars").getAttribute("aria-label") === "星2つ"; }) && (await page.locator("#board button.tip.ok").count()) === 1);
  await page.click("#next");
  c = await cur(page);
  check("2問目「年にいくら？」：工夫1枚と金額3つ", c.q.k === "y" && (await page.locator(".yens button").count()) === 3);
  await page.click("#hint");
  check("ヒント（いくら）：ちがう金額を1つ消す（取り消し線・押せない）", (await page.locator(".yens button.gone").count()) === 1 && (await page.locator(".yens button.gone").isDisabled()) && (await page.getAttribute(".yens button.gone", "data-j")) !== String(c.ans));
  await answer(page, false);
  check("はずれると「✕ ざんねん」・正しい金額に ✓、選んだ金額に ✕・★1", await page.evaluate(() => { const v = document.querySelector(".verdict"); return v.textContent.includes("✕ ざんねん") && v.classList.contains("miss") && document.querySelectorAll(".yens button.ok").length === 1 && document.querySelectorAll(".yens button.ng").length === 1 && v.querySelector(".stars").getAttribute("aria-label") === "星1つ"; }));
  await page.click("#next");
  await page.reload(); await closeHow(page);
  check("途中で閉じても、ホームに「続きから（3問目）」が出る", (await page.textContent("#go-d")).includes("続きから（3問目）"));
  await page.click("#go-d");
  c = await cur(page);
  check("続きからは同じ3問目", c.i === 2 && JSON.stringify(c.q) === JSON.stringify(G.dailyList(k)[2]));
  await page.click("#hint"); await page.reload(); await closeHow(page); await page.click("#go-d");
  check("ヒントを使って閉じても、続きからでヒントは使ったまま", (await cur(page)).h === 1 && (await page.locator("#hint").isDisabled()));
  for (let j = 2; j < 5; j++) { await answer(page, true); if (j < 4) await page.click("#next"); }
  check("5問目のあとは「結果を見る」", (await page.textContent("#next")).includes("結果を見る"));
  await page.click("#next");
  const res = await page.evaluate(() => ({ share: document.querySelector(".share") && document.querySelector(".share").textContent, rows: document.querySelectorAll(".res > div").length, sum: document.querySelector(".sum") && document.querySelector(".sum").textContent, kofi: /Ko-fi でコーヒー/.test(document.getElementById("app").innerText), e: !!document.getElementById("go-e"), h: !!document.getElementById("go-h") }));
  const s1 = await page.evaluate(() => window.__sk.load());
  check("結果：5問の行・得なほうを全部やると年にいくら（目安）・シェア・とことん・上級に挑む", res.rows === 5 && /1年で 約[\d,]+円/.test(res.sum) && /目安/.test(res.sum) && res.e && res.h && !!res.share, JSON.stringify(res));
  check("シェアの文に工夫の名前・金額を出さない", G.dailyList(k).flatMap(G.idsOf).every((t) => !res.share.includes(T[t].a)) && !/円/.test(res.share) && /🟨/.test(res.share) && /🟧/.test(res.share));
  check("今日の記録がつき、出会った工夫が増える", !!s1.days[k] && s1.days[k].r.length === 5 && Object.keys(s1.seen).length >= 5);
  check("はずれのある日は Ko-fi の1行を出さない", !res.kofi);
  await page.click("#back");
  check("ホームに「今日の結果を見る」", (await page.textContent("#go-d")).includes("今日の結果を見る"));
  // 上級
  await page.click("#go-h");
  c = await cur(page);
  check("上級：3つから選ぶ・ヒントのボタンが無い", c.mode === "h" && c.q.k === "m" && (await page.locator("#board button.tip").count()) === 3 && (await page.locator("#hint").count()) === 0);
  for (let j = 0; j < 3; j++) { await answer(page, true); await page.click("#next"); }
  check("上級の記録がつく", await page.evaluate(() => { const s = window.__sk.load(); return !!s.hdays[window.__sk.todayKey()] && s.hdays[window.__sk.todayKey()].r.length === 3; }));
  // とことん
  await page.click("#go-e");
  for (let j = 0; j < 4; j++) { await answer(page, true); await page.click("#next"); }
  c = await cur(page);
  check("とことん：4問目は「いちばん得は？」", c.i === 4 || c.q.k === "y", c.i + ":" + c.q.k);
  await answer(page, false);
  check("とことん：はずれても終わらない（続けての数は0から）", (await page.locator("#quit").count()) === 1 && /0から/.test(await page.textContent(".verdict")));
  await page.click("#next");
  await answer(page, true); await page.click("#next");
  await page.click("#quit");
  check("とことん：「ここで降りる」で終わり、続けて当てた数の自己ベスト（4）を残す", await page.evaluate(() => window.__sk.load().ebest === 4 && /続けて最高 4問/.test(document.getElementById("app").innerText)));
  check("とことんは今日の記録・連続には数えない", await page.evaluate((d) => JSON.stringify(window.__sk.load().days) === JSON.stringify(d), s1.days));
  await page.click("#go-e");
  await page.evaluate(() => { const s = window.__sk; s.save((x) => { x.runs.e.res = x.runs.e.list.slice(0, -1).map(() => ({ m: 0, h: 0 })); }); s.play("e"); });
  check("とことんは問題が尽きない（並びの最後まで来たら新しい並びをつなげる）", await page.evaluate(() => window.__sk.load().runs.e.list.length >= 2 * window.SKG.TIPS.length - 1 && !!window.__sk.cur()));
  await page.evaluate(() => window.__sk.home());
  // 練習・コツ帳
  await page.click("#go-p");
  check("練習：4つのなかまから選べる", (await page.locator(".res button").count()) === 4);
  await page.click('.res button[data-g="照明"]');
  c = await cur(page);
  check("練習：選んだなかまの工夫が出る", c.mode === "p" && T[G.idsOf(c.q)[0]].g === "照明");
  for (let j = 0; j < 5; j++) { await answer(page, true); if (j < 4) await page.click("#next"); }
  check("練習の5問目のあとは「練習のまとめへ」", (await page.textContent("#next")).includes("練習のまとめ"));
  await page.click("#next");
  check("練習は今日の記録に入らない", await page.evaluate((d) => JSON.stringify(window.__sk.load().days) === JSON.stringify(d), s1.days));
  await page.click("#go-dex");
  const met = await page.evaluate(() => Object.keys(window.__sk.load().seen).map(Number));
  check("コツ帳：出会った工夫は押せる、まだの工夫は「？？？」", (await page.locator(".res .no").count()) === T.length - met.length && (await page.locator(".res button[data-t]").count()) === met.length);
  await page.click(`.res button[data-t="${met[0]}"]`);
  check("コツ帳の工夫：金額・条件・なぜ・出典・「この工夫から練習する」", (await page.textContent(".detail .yy")).includes("円") && (await page.locator('.detail a[href^="https://www.enecho.meti.go.jp/"]').count()) === 1 && (await page.locator("#again").count()) === 1);
  await page.click("#again");
  check("コツ帳から練習：その工夫が1問目に出る", G.idsOf((await cur(page)).q).includes(met[0]));
  await page.close();

  // あとから（取りこぼした日）・カレンダー
  { const p = await newPage();
    await p.evaluate((K) => { localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, t: 1 })); }, KEY);
    await p.reload();
    const lt = await p.evaluate(() => window.__sk.lateDays(window.__sk.load()));
    check("取りこぼした日は、はじめの日（" + G.EPOCH + "）より前を出さない・7日まで", lt.every((d) => d >= G.EPOCH) && lt.length <= 7);
    await p.evaluate(() => { const RD = Date, off = 3 * 864e5; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; });
    await p.evaluate(() => window.__sk.home()); await p.click("#go-cal");
    const lt2 = await p.evaluate(() => window.__sk.lateDays(window.__sk.load()));
    check("カレンダー：あとから遊べる日は ▶（点線のボタン）", lt2.length > 0 && (await p.locator(`.cal button[data-k="${lt2[0]}"]`).count()) === 1, JSON.stringify(lt2));
    if (lt2.length) {
      const dk = lt2[0];
      await p.click(`.cal button[data-k="${dk}"]`);
      const ca = await cur(p);
      check("あとから：その日の今日の5問と同じ問題", ca.mode === "a" && JSON.stringify(ca.q) === JSON.stringify(G.dailyList(dk)[0]));
      for (let j = 0; j < 5; j++) { await answer(p, true); await p.click("#next"); }
      const sl = await p.evaluate(() => window.__sk.load());
      check("あとから：記録は late に入り、今日の記録（days）には入らない・シェアは出さない", !!sl.late[dk] && !sl.days[dk] && !(await p.locator(".share").count()));
    }
    await p.close(); }

  // 実績
  { const p = await newPage();
    await p.evaluate((K) => { localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, seen: { 0: 1, 1: 1, 2: 1 }, t: 1 })); }, KEY);
    await p.reload();
    const al = await p.evaluate(() => window.__sk.achList(window.__sk.load()));
    check("実績は10〜14個", al.length >= 10 && al.length <= 14, al.length);
    await p.click("#go-ach");
    check("実績の画面：取った ★・まだ ☆ と進み具合", (await p.textContent(".achs")).includes("★ はじめの工夫") && (await p.textContent(".achs")).includes("いま 3/10"));
    await p.close(); }

  // 全部一度で当てた日は Ko-fi の1行（今日の5問を初めて終えたときだけ）
  { const p = await newPage(); await closeHow(p);
    await p.click("#go-d");
    for (let j = 0; j < 5; j++) { await answer(p, true); await p.click("#next"); }
    check("全部一度で当てた日は、結果の画面の下に Ko-fi の1行（ただのリンク）", (await p.locator('a[href="https://ko-fi.com/satouaaaaa"]').count()) >= 2 && /Ko-fi でコーヒー/.test(await p.innerText("#app")) && /全部一度で/.test(await p.textContent(".share")));
    await p.click("#back"); await p.click("#go-d");
    check("結果をもう一度見ても Ko-fi の1行は出さない", !/Ko-fi でコーヒー/.test(await p.innerText("#app")));
    await p.close(); }

  // 古いタブ・記録の読み合わせ
  { const p = await newPage(); await closeHow(p);
    await p.click("#go-d");
    const r = await p.evaluate((K) => { const s = JSON.parse(localStorage.getItem(K)); s.runs.d.id = "other"; localStorage.setItem(K, JSON.stringify(s)); window.__sk.pick(window.__sk.answer()); return window.__sk.load().runs.d.res.length; }, KEY);
    check("別のタブで回が変わっていたら、古いタブの答えを記録しない", r === 0);
    check("保存に失敗したあと別のタブが保存しても、両方の日ごとの結果を残し、数は大きいほう", await p.evaluate((K) => { const s0 = window.__sk.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": { r: [] } }, seen: { 3: 9 }, ebest: 7 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": { r: [] } }, seen: { 3: 2 }, ebest: 3 }))); const r = window.__sk.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"] && r.seen[3] === 9 && r.ebest === 7; }, KEY));
    check("同じ回の途中経過は、進んだほう（新しく保存したタブが遅れていても）", await p.evaluate((K) => { const s0 = window.__sk.load(), base = { mode: "d", date: "2000-01-01", list: [], id: "x" }; mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: Object.assign({}, base, { res: [{ m: 0, h: 0 }] }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { res: [] }) } }))); const r = window.__sk.load(); mem = null; return r.runs.d.res.length === 1; }, KEY));
    check("こわれた記録でも画面が出る（入れ物を補う）", await p.evaluate((K) => { localStorage.setItem(K, JSON.stringify({ v: 1, days: 5, seen: null, runs: "x" })); try { window.__sk.home(); return !!document.getElementById("go-d"); } catch (e) { return false; } }, KEY));
    check("途中経過の中身がこわれていても（res が [null]・知らない問題）ホームが出て、その回だけ消える", await p.evaluate((K) => { const k = window.__sk.todayKey(); for (const bad of [{ res: [null], list: [] }, { res: [], list: [{ k: "p", a: 0, b: 0 }] }, { list: [] }]) { localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: {}, runs: { d: Object.assign({ mode: "d", date: k, id: "q" }, bad) } })); try { window.__sk.home(); if (!document.getElementById("go-d") || window.__sk.load().runs.d) return false; } catch (e) { return false; } } return true; }, KEY));
    check("「ここで降りる」で終えた回は、古いタブの写しと合わせても戻らない", await p.evaluate((K) => { const base = { mode: "e", date: "2000-01-01", list: [], res: [{ m: 0, h: 0 }], id: "endrun" }; localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, t: 9, ended: ["endrun"], runs: {} })); mem = JSON.stringify({ v: 1, tut: true, t: 5, runs: { e: base } }); const r = window.__sk.load(); mem = null; return !r.runs.e; }, KEY));
    check("きのう解き終えて結果を見ずに閉じた回も、次に開いたとき記録する", await p.evaluate((K) => { const y = window.__sk.prevDay(window.__sk.todayKey()), list = window.SKG.dailyList(y); localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, t: 1, runs: { d: { mode: "d", date: y, id: "yy", list, res: list.map(() => ({ m: 0, h: 0 })), cur: null } } })); window.__sk.home(); const s = window.__sk.load(); return !!s.days[y] && !s.runs.d; }, KEY));
    await p.close(); }

  // スマホ幅 320px・押せる所の大きさ
  { const p = await newPage({ viewport: { width: 320, height: 640 } }); await closeHow(p);
    const over = async () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    const small = async () => p.evaluate(() => [...document.querySelectorAll("button,a,input")].filter((b) => { const r = b.getBoundingClientRect(); return r.width && r.height && r.height < 44 && !b.closest(".a11y-dlg") && getComputedStyle(b).visibility !== "hidden"; }).map((b) => b.id || b.textContent.trim().slice(0, 10)));
    const o1 = await over(), s1b = await small();
    await p.click("#go-h");
    const o2 = await over(), s2 = await small();
    await answer(p, true);
    const o3 = await over(), s3 = await small();
    await p.evaluate(() => window.__sk.home()); await p.click("#go-dex");
    const o4 = await over();
    check("幅320pxでも横にはみ出さない（ホーム・上級の3枚・答えのあと・コツ帳）", !o1 && !o2 && !o3 && !o4);
    check("押せる所は高さ44px以上（ホーム・遊ぶ画面・答えのあと）", !s1b.length && !s2.length && !s3.length, JSON.stringify([s1b, s2, s3]));
    await p.close(); }

  // 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
  { const sample = { [KEY]: JSON.stringify({ v: 1, tut: true, days: { "2026-11-07": { r: [{ m: 0, h: 0 }] } }, hdays: {}, late: {}, seen: { 0: 1, 5: 2 }, one: { 0: 1 }, ebest: 4, runs: {}, ach: {}, kofi: {}, t: 1 }) };
    await checkTransfer({ browser, url, game: "setsuden-kotsu", sample, check, open: async (page) => { await page.evaluate(() => { const d = document.getElementById("howto"); if (d.open) d.close(); }); } }); }
} catch (e) {
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  if (browser) await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));
{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 節電のコツ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
