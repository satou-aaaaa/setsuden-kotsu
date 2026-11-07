// 節電のコツの決まり（だれでも同じ今日の5問・上級・問題の組み方・とことんの並び）。画面と検査（qa/run.mjs）の両方から使う。
// 問題は3つの形：
//   p「どっちが得？」 { k:"p", a, b }        2つの工夫のうち、1年の節約が大きいほうを選ぶ
//   y「年にいくら？」 { k:"y", t, o:[円×3] }  1つの工夫の、1年の節約の目安を3つから選ぶ
//   m「いちばん得は？」{ k:"m", ts:[3つ] }    3つの工夫のうち、1年の節約がいちばん大きいものを選ぶ
(function () {
  const D = typeof module !== "undefined" ? require("./data.js") : window.SKD;
  const TIPS = D.TIPS.map((t, id) => Object.assign({ id }, t));
  // 今日の5問・上級に使うのは、この番号までの工夫だけ（あとから足しても過去の日の問題が変わらない）。足した分は練習・とことんに出る
  const DAILY_MAX_ID = 42;
  const EPOCH = "2026-11-07";
  const KINDS = ["p", "y", "p", "y", "p"]; // 今日の5問の形
  const RATIO = [3, 0, 2, 0, 1.4]; // 今日の「どっちが得？」の、大きいほう÷小さいほうの下限（だんだん近くなる）
  const RATIO_HI = [0, 0, 4, 0, 2.2]; // 上限（0は無し）
  const HARD_N = 3;

  // ---- 種と乱数（日本時間の日付から。ここでは端末ごとの乱数を使わない）----
  function seedOf(str) { let h = 2166136261 >>> 0; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 並べかえ（フィッシャー–イェーツ。sort の比較の中で乱数を引かない）
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const dayNo = (k) => Math.max(1, Math.round((Date.parse(k) - Date.parse(EPOCH)) / 864e5) + 1);
  const ratio = (x, y) => Math.max(x, y) / Math.min(x, y);
  const pick = (a, r) => a[Math.floor(r() * a.length)];

  // ---- 問題の答え・形 ----
  const idsOf = (q) => (q.k === "p" ? [q.a, q.b] : q.k === "m" ? q.ts : [q.t]);
  // 答えの番号（p・m は大きいほうのカード、y は正しい金額の場所）
  function answerOf(q) {
    if (q.k === "y") return q.o.indexOf(TIPS[q.t].y);
    const ys = idsOf(q).map((i) => TIPS[i].y);
    return ys.indexOf(Math.max(...ys));
  }
  // 問題の形が正しいか（保存してあった問題を使う前に確かめる）
  function valid(q) {
    if (!q || typeof q !== "object" || !["p", "y", "m"].includes(q.k)) return false;
    const ids = idsOf(q);
    if (!Array.isArray(ids) || !ids.every((i) => Number.isInteger(i) && i >= 0 && i < TIPS.length) || new Set(ids).size !== ids.length) return false;
    if (q.k === "p") return ids.length === 2 && TIPS[q.a].y !== TIPS[q.b].y;
    if (q.k === "m") { if (ids.length !== 3) return false; const ys = ids.map((i) => TIPS[i].y).sort((a, b) => b - a); return ys[0] > ys[1]; }
    return Array.isArray(q.o) && q.o.length === 3 && q.o.every((v) => Number.isInteger(v) && v > 0) && new Set(q.o).size === 3 && q.o.filter((v) => v === TIPS[q.t].y).length === 1;
  }

  // ---- 部品：相手・選び肢 ----
  // 「どっちが得？」の相手：差が lo 倍以上（hi 倍まで）・今日まだ使っていない・同じ金額でない
  function partner(t, r, pool, used, lo, hi) {
    const y = TIPS[t].y;
    let c = pool.filter((i) => i !== t && !used.has(i) && TIPS[i].y !== y && ratio(TIPS[i].y, y) >= lo && ratio(TIPS[i].y, y) <= (hi || 1e9));
    if (!c.length && hi) c = pool.filter((i) => i !== t && !used.has(i) && TIPS[i].y !== y && ratio(TIPS[i].y, y) >= lo && ratio(TIPS[i].y, y) <= hi * 2);
    if (!c.length) c = pool.filter((i) => i !== t && !used.has(i) && TIPS[i].y !== y && ratio(TIPS[i].y, y) >= Math.min(lo, 1.2));
    if (!c.length) c = pool.filter((i) => i !== t && TIPS[i].y !== y);
    return pick(c, r);
  }
  // 「年にいくら？」の選び肢：ほかの工夫の金額から、正しい金額と1.6倍以上ちがう2つ（2つどうしも1.3倍以上ちがう）
  const yenOf = (ids) => [...new Set(ids.map((i) => TIPS[i].y))].sort((a, b) => a - b);
  const YEN = yenOf(TIPS.map((t) => t.id)), YEN_D = yenOf(TIPS.filter((t) => t.id <= DAILY_MAX_ID).map((t) => t.id));
  function yenQ(t, r, Y) {
    const YEN = Y, y = TIPS[t].y, lo = YEN.filter((v) => v * 1.6 <= y), hi = YEN.filter((v) => v >= y * 1.6);
    const shape = pick(lo.length >= 2 && hi.length >= 2 ? ["lh", "ll", "hh", "lh"] : lo.length && hi.length ? ["lh"] : lo.length >= 2 ? ["ll"] : ["hh"], r);
    const from = (L, n) => { const out = []; for (const v of shuffle(L, r)) { if (out.every((w) => ratio(v, w) >= 1.3)) out.push(v); if (out.length === n) break; } return out; };
    let o = shape === "lh" ? [pick(lo, r), pick(hi, r)] : from(shape === "ll" ? lo : hi, 2);
    if (o.length < 2 || ratio(o[0], o[1]) < 1.3) o = from(lo.concat(hi), 2);
    return { k: "y", t, o: shuffle([y].concat(o), r) };
  }
  // 「いちばん得は？」：いちばん大きいものが2番目の lo 倍以上（top があれば top 倍まで。見つからなければ上の限りなしで探す）
  function maxQ(t, r, pool, used, lo, top) {
    const y = TIPS[t].y;
    for (const cap of top ? [top, Infinity] : [Infinity]) for (let g = 0; g < 40; g++) {
      const c = shuffle(pool.filter((i) => i !== t && !used.has(i) && TIPS[i].y !== y), r).slice(0, 2);
      if (c.length < 2) break;
      const ys = [t].concat(c).map((i) => TIPS[i].y).sort((a, b) => b - a);
      if (ys[0] >= ys[1] * lo && ys[0] <= ys[1] * cap && ys[1] !== ys[2]) return { k: "m", ts: shuffle([t].concat(c), r) };
    }
    const rest = pool.filter((i) => i !== t && TIPS[i].y < y / lo).slice(0, 2);
    return { k: "m", ts: shuffle([t].concat(rest.length === 2 ? rest : pool.filter((i) => i !== t).slice(0, 2)), r) };
  }
  function make(kind, t, r, pool, used, lo, hi, top) {
    const q = kind === "y" ? yenQ(t, r, pool === POOL ? YEN_D : YEN) : kind === "m" ? maxQ(t, r, pool, used, lo, top) : (() => { const b = partner(t, r, pool, used, lo, hi); return r() < 0.5 ? { k: "p", a: t, b } : { k: "p", a: b, b: t }; })();
    idsOf(q).forEach((i) => used.add(i));
    return q;
  }

  // ---- 今日の5問・上級（工夫の山を周ごとにちがう順に並べ、毎日5つずつ「主役」にする。前の周の終わりの3分の1は次の周のはじめの3分の1に置かない）----
  const POOL = TIPS.filter((t) => t.id <= DAILY_MAX_ID).map((t) => t.id);
  const perms = new Map();
  function permOf(tag, cyc) {
    const id = tag + ":" + cyc;
    if (perms.has(id)) return perms.get(id);
    let p = shuffle(POOL, rng(seedOf("setsuden:" + id)));
    if (cyc > 0) {
      const prev = permOf(tag, cyc - 1), third = Math.floor(POOL.length / 3), tail = new Set(prev.slice(prev.length - third));
      const head = p.filter((x) => !tail.has(x)).slice(0, third);
      p = head.concat(p.filter((x) => !head.includes(x)));
    }
    perms.set(id, p);
    return p;
  }
  function take(tag, start, k, used) {
    const N = POOL.length, out = [];
    for (let p = start; out.length < k && p < start + N; p++) {
      const id = permOf(tag, Math.floor(p / N))[((p % N) + N) % N];
      if (used.has(id)) continue;
      used.add(id); out.push(id);
    }
    return out;
  }
  const dmemo = new Map();
  function dailyList(k) {
    if (dmemo.has(k)) return dmemo.get(k);
    const r = rng(seedOf("d:" + k)), main = take("d", (dayNo(k) - 1) * KINDS.length, KINDS.length, new Set()), used = new Set(main);
    const out = KINDS.map((kind, j) => { used.delete(main[j]); return make(kind, main[j], r, POOL, used, RATIO[j], RATIO_HI[j]); });
    dmemo.set(k, out);
    return out;
  }
  // 上級：「いちばん得は？」を3問（いちばんと2番目が1.25〜1.6倍の近い組）。今日の5問と同じ工夫は出さない
  function hardList(k) {
    const used = new Set(dailyList(k).flatMap(idsOf)), r = rng(seedOf("h:" + k));
    const main = take("h", (dayNo(k) - 1) * HARD_N + 7, HARD_N, new Set(used));
    main.forEach((t) => used.add(t));
    return main.map((t) => { used.delete(t); return make("m", t, r, POOL, used, 1.25, undefined, 1.6); });
  }
  // ★：まちがえたら★1、ヒントを使って当てたら★2、そのまま当てたら★3
  const starsOf = (r) => (r.m ? 1 : r.h ? 2 : 3);

  // ---- とことん：全部の工夫を毎回ちがう順に「主役」にし、形は p→y→p→m→y の順にくり返す。差はだんだん近くなる ----
  const EKINDS = ["p", "y", "p", "m", "y"];
  const eRatio = (i) => Math.max(1.25, 3 - i * 0.1);
  function endlessList(r, avoid, from) {
    let ids = shuffle(TIPS.map((t) => t.id), r);
    if (avoid != null && ids[0] === avoid) ids = ids.slice(1).concat(ids[0]);
    const all = TIPS.map((t) => t.id);
    return ids.map((t, j) => { const i = (from || 0) + j; return make(EKINDS[i % EKINDS.length], t, r, all, new Set(), eRatio(i), i < 5 ? 0 : eRatio(i) * 2); });
  }
  // 練習：選んだなかまの工夫を主役に5問（相手はなるべく同じなかまから）。g が無ければ全部から
  function practiceList(r, g, first) {
    const all = TIPS.map((t) => t.id), mine = g ? all.filter((i) => TIPS[i].g === g) : all;
    let ids = shuffle(mine, r);
    if (first != null && mine.includes(first)) ids = [first].concat(ids.filter((i) => i !== first));
    ids = ids.slice(0, 5);
    return ids.map((t, j) => { const kind = ["p", "y", "m", "p", "y"][j], pool = mine.length >= 6 ? mine : all; return make(kind, t, r, pool, new Set(), kind === "m" ? 1.2 : 1.4); });
  }

  const api = { TIPS, EPOCH, DAILY_MAX_ID, KINDS, RATIO, RATIO_HI, HARD_N, YEN_D, GROUPS: D.GROUPS, PRICE: D.PRICE, seedOf, rng, shuffle, dayNo, ratio, idsOf, answerOf, valid, dailyList, hardList, starsOf, endlessList, practiceList, eRatio };
  if (typeof module !== "undefined") module.exports = api; else window.SKG = api;
})();
