# 節電のコツ

家電の使い方を少し変えると、1年の電気代はどれだけ変わる？ 「どっちが得？」「年にいくら？」を当てながら、家でできる節電のコツが身につくゲームです。

- 遊ぶ: <https://satou-aaaaa.github.io/setsuden-kotsu/>
- 1問ずつ、工夫のカードから1年の節約が大きいほうを選ぶか、節約の目安の金額を3つから選びます。答えると、金額の棒・へる量・なぜ節約になるか・出典のページが出ます。
- 今日の5問（どっち・いくら・どっち・いくら・どっち。だんだん差が近くなる）と上級（3つからいちばん得を選ぶ×3・ヒントなし）はだれでも同じで1日1回。とことん（何問続けて当てられる？）と練習（なかまを選ぶ）は何度でも。
- 出会った工夫は「コツ帳」に集まり、いつでも金額と出典を読めます。実績・カレンダー（7日前まであとから遊べる）もあります。時間制限はありません。
- 工夫は48。なかまは冷暖房・キッチン・照明・テレビ・パソコン・洗濯・掃除の5つ（洗濯・掃除の5つは練習・とことん・コツ帳で出会えます）。
- コツ帳で「わが家でやる」を選んだ工夫は、1年の節約の合計（目安）が出ます。
- 記録は遊ぶ人のブラウザにだけ残り、ゲームから自動で外へ送ることはありません。例外は2つ：文字（Google Fonts）を読み込むとき、Google に IP アドレスが届きます。「Xで投稿」「LINEで送る」「結果をシェア」を押したときだけ、結果の文が選んだ先に渡ります（工夫の名前や金額は入りません）。

## 数字の出どころ

- 金額とへる量は、資源エネルギー庁「省エネポータルサイト」の [無理のない省エネ節約](https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/) にある、家庭の1年の目安です（[冷暖房](https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/airconditioning/index.html)・[キッチン](https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/kitchen/index.html)・[照明](https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/lighting/index.html)・[テレビ・パソコン](https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/entertainment/index.html)・[洗濯機・掃除機](https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/cleaning/index.html)）。ページの「約」の値をそのまま使い、計算し直していません（2026-11-07 に確かめた）。
- ページの計算の前提は、電気 31円/kWh（令和4年7月の目安単価）・ガス 162円/m³・灯油 86円/L・水道 260円/m³ です。いまの料金や、家の広さ・使い方で金額は変わるので、ゲームでは「目安」と書いています。
- まちがいを見つけたら、[感想のフォーム](https://github.com/satou-aaaaa/setsuden-kotsu/issues/new?template=feedback.yml)で教えてください。

## 開発

```bash
bash scripts/setup.sh   # 最初に一度
node qa/run.mjs         # 検査（CI と同じ）
node tools/make-icons.cjs && node tools/make-og.cjs   # アイコンと SNS 用の絵を作り直すとき
```
