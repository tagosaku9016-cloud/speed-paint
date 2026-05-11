# 🎨 Speed Paint

写真から手描き風のスピードペイント（タイムラプス）動画をブラウザ内で自動生成するWebアプリ。

## 特徴

- 📱 **iPhoneでそのまま動く** — Safari / Chrome on iOS（WebKit）対応
- 🌐 **完全クライアント完結** — 画像はサーバーに送信されません
- 🖌️ **4種類のブラシ** — 鉛筆 / ペン / マーカー / 水彩
- 🎞️ **4フェーズ演出** — 下書き → 線画 → ベタ塗り → 仕上げ
- 🎚️ **設定可能** — 再生速度 (0.5x〜3x) / 動画長 (10/30/60秒) / 画質 (720p/1080p)
- 📤 **MP4出力 + Web Share API** — 写真に保存・LINE/Xに共有が直接できる

## 使い方

1. 写真を選ぶ（カメラロール or その場で撮影）
2. ブラシ・速度・長さ・画質を選ぶ
3. 「動画を作る」を押す
4. 完成した動画を保存 / 共有

## 開発

```bash
npm install
npm run dev
```

ビルド：

```bash
npm run build
```

## デプロイ

`main` ブランチへの push で GitHub Actions が自動的にビルドし、GitHub Pages にデプロイします。

**初回のみ手動設定が必要**：リポジトリの Settings → Pages → Source を **"GitHub Actions"** に設定してください。

## 技術スタック

- Vite + React + TypeScript
- Canvas 2D API（Sobel エッジ検出 + Moore-neighbor 輪郭追跡 を自前実装）
- MediaRecorder API（MP4優先 / WebMフォールバック）
- Web Share API
