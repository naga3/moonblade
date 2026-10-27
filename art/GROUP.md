# 月影の剣のドット絵

横から見た剣アクション。画面は320×240。月夜の青緑の遺跡、赤茶のくせ毛（アホ毛1本）、水色の服、赤いマフラーの小さな剣士。

- 色は `palette moonblade`（`moonblade.gpl`）の共通64色だけ。色の追加やファイル独自の `rgb` は使わない。
- 主人公・敵・地形は16×16。剣、背景、文字、アイコンは絵ごとの大きさ。透明は `.`。点は整数座標、アンチエイリアスなし。
- `characters/hero.pic`: 右向きが基準。2頭身のデフォルメ（頭は上の10行、兜はかぶらない）。ゲームで左向きに反転する。`stand`、`stand2`、`walk1`〜`walk4`、`jump`、`jump2`、`attack_side`、`attack_up`、`attack_down`。`idle`・`walk`・`air`のanimをゲームも使う。足元は15行目。
- `enemies/`: 敵は左向きが基準。`slime`・`bat`・`wisp`（鬼火）・`beetle`（鎧甲虫）は `idle` のanim、`knight` と `sentinel` は `stand`。`king`（月の王）は `stand`・`float`（浮く。上突きが効く）・`guard`（盾。頭への下突きが効く）。ボスも16×16。`beetle` は赤い腹が下から見える弱点。
- `tiles/`: `grove`（森。4面の沼も）・`ruins`（水路。5面の鐘楼も）・`keep`（城。6面の玉座も）。`top_even`・`top_odd`（地表）、`ground_even`・`ground_odd`（地下）、`platform`（足場）、`spikes`（トゲ）。当たり判定は絵と別なので、足場の上端は0行目、地面は全面を埋める。
- `weapons/sword.pic`: 右向きの横斬り `side`（32×16）、上突き `up`（16×32、主人公の17点上）、下突き `down`（16×32、主人公の8点下）。敵の剣は `enemy_` の絵。
- `background/`: 月と木と建物。背景だけは大きい絵。`scenery.pic` は奥の建物（`aqueduct` 2面・`keep` 3面・`belfry` 5面・`throne` 6面。85×129、左上が画面のy=80で、105点ごとに横へ繰り返す）と、手前の `column`（2面・5面の柱）・`post`（1面・4面の杭）。4面は木（`trees.pic`）を使う。空・星・山の稜線・川面のきらめきはゲーム側の描画。`ui/font.pic` は単色の文字の形（ゲーム側で文字色を付ける）。
- 候補 `~A` などは採用するまでゲームに出ない。元の名前を保つ。新しいコマはanimに足せばゲームでも動く。

Pixelで描くと自動保存され、`tools/art.mjs` が `dist/art-data.js` を更新する。`npm start` のローカル画面は更新後に自動で読み直す。公開URLへは `main` に push すると反映される。
