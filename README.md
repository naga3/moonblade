# 月影の剣 / MOONBLADE

月夜の森、古い水路、城門を進む横スクロール剣アクション。全6エリア。3面の終わりに剣士、6面の終わりに月の王（ラスボス）が待っています。

`dist/index.html` をブラウザで開くか、`npm start` で http://localhost:4173 を開いてください。ゲーム本体に外部ライブラリや通信は不要です。

| 操作 | キー |
| --- | --- |
| 移動 | ← → / A D |
| 剣 | Z / J |
| ジャンプ | X / K / Space（長押しで高く） |
| 上突き | ↑ / W + 剣 |
| 下突き | 空中で ↓ / S + 剣 |
| 開始・決定 | Enter |
| 一時停止 | P / Esc |
| 操作説明 | H |
| 音の切り替え | M |

下突きで敵に当たると跳ね返ります。4面の鬼火は下突きでしか倒せず、穴の上を跳ねて渡る足場になります（しばらくすると元に戻ります）。5面の鎧甲虫は殻が硬く、下から上突きで腹を突かないと倒せません。月の王は、浮いている間は上突き、盾を構えている間は頭に下突き、突進の後はどの攻撃でも効きます。剣を振っている途中でも ↑ / ↓ を押すと突きに切り替わります。旗で体力が2回復し、落下時の復帰地点になります。体力がなくなったらそのエリアから再挑戦。スマートフォンではゲーム画面内にタッチボタンが出ます。右端の門を目指してください。

描画解像度は **320×240**。共通の固定 **64色パレット1枚**を使い、すべてのピクセルを色番号で描画します。プレイヤー、敵、地形タイルは **16×16**。剣とエフェクトは別描画。文字も自作ビットマップで描き、HUD・説明・タッチボタンまで320×240内に収めています。表示領域に応じて整数倍に拡大し、320×240未満の端末では縮小します。

絵と文字の形は **PX-13h Pixel**、BGMと効果音は **PX-13h Music** で編集できます。ゲームで使うデータは同梱しているので、プレイ時はPX-13hの起動や素材のダウンロードは不要です。`dist/index.html` を直接開いても絵と音が動きます。

## Pixel / Musicで編集

PX-13h側の `tools/pixel/groups.json` と `tools/music/groups.json` に、それぞれ `"moonblade": "../moonblade/art"` と `"moonblade": "../moonblade/music"` を登録しています。

PX-13hのフォルダーで、それぞれ別のターミナルから起動します。

```sh
tools/pixel/run.sh moonblade/characters/hero
tools/music/run.sh moonblade/field
```

- Pixelの一覧の「moonblade」から、主人公、敵、森・水路・城のタイル、剣、アイコン、月と木、フォントを開けます。絵は `art/**/*.pic`、共通64色は `art/moonblade.gpl`、編集上の決まりは `art/GROUP.md`。`anim` に書いたコマと時間をゲームのアニメーションにも使います。地形の配置・当たり判定は `dist/game.js` の `makeLevel` で設定します。
- Musicの一覧の「moonblade」には `field` のBGMと、`jump`・`sword`・`hit`・`hurt`・`gem`・`bounce`・`check`・`win` の効果音があります。元のメロディを `.song` に移し、Musicと同じファミコン音源で鳴らします。保存時に `.picks.json` の採用候補も反映します。
- Pixelは自動保存、Musicは保存した後、各 `group.json` の `after` がゲーム用データを書き出します。**moonbladeで `npm start` しているローカル画面は自動で読み直されます**。公開URL（https://naga3.github.io/moonblade/）へは、`main` に push すると GitHub Actions が `dist/` を配信します。

手動で書き出すときはmoonbladeで実行します。既定では隣の `../px13h` を使います。別の場所なら `PX13H=/path/to/px13h npm run build` を指定してください。

```sh
npm run art     # art/ → dist/art-data.js
npm run audio   # music/ → dist/audio-data.js
npm run build   # 両方
```

書き出しにはPX-13hのパーサーと `tools/music/web/engine.wasm` を使用します。WAVをJavaScriptに埋め込むため、ffmpegは不要です。生成された `dist/*-data.js` は手で編集せず、元の `.pic`・`.song` を直してください。

ブラウザ検証: `npm install`、`npx playwright install chromium`、`npm test`。素材の形式・64色・16×16、編集と候補選択の反映、通常操作、ジャンプの高さ、剣の3方向、下突きの跳ね返り、チェックポイント、ポーズ、6エリアと2体のボスの攻略、敵ごとに効く突きの向き、実フレームバッファの色数、モバイル表示、WAV再生と消音、HTMLを直接開く場合も確認します。テスト専用フックは `?test` のときだけ有効です。
