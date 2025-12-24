# AI-Rathispherd

錫（Tin）取引のリスク管理・損益管理システム

## 概要

指定期間（2026-01-01 〜 2026-07-05）の取引発生・計上・先物カーブ・評価（MTM）・月末/日次ポジション内訳を可視化するシステムです。

- **対象商品**: 錫（Tin）
- **通貨**: USD
- **数量単位**: metric ton (mt)
- **基準日**: 2026-07-05
- **粒度**: 2026-06-30まで月次、2026-07-01以降日次

## アーキテクチャ

- **フロントエンド**: Next.js (Amplify Hosting)
- **API**: API Gateway (HTTP API) + Lambda
- **データベース**: RDS PostgreSQL 16 (t4g.micro)
- **ローカル開発**: Docker Compose + PostgreSQL 16

## プロジェクト構成

```
AI-Rathispherd/
├── apps/web/              # Next.js フロントエンド
├── services/api/           # Lambda 関数
├── infra/cdk/              # AWS CDK インフラ
├── scripts/                # データベース初期化・シードスクリプト
├── docker-compose.yml      # ローカルPostgreSQL
└── README.md
```

## ローカル開発セットアップ

### 1. 前提条件

- Node.js 20以上
- Docker & Docker Compose
- npm または pnpm

### 2. データベース起動

```bash
docker-compose up -d
```

データベースが起動するまで数秒待ちます。

### 3. ダミーデータ生成

```bash
cd scripts
npm install
npm run seed
```

### 4. API開発（ローカル）

```bash
cd services/api
npm install
npm run build
npm run dev
```

APIサーバーが `http://localhost:3001` で起動します。

### 5. フロントエンド起動

別のターミナルで：

```bash
cd apps/web
npm install
npm run dev
```

フロントエンドが `http://localhost:3000` で起動します。

### 6. 環境変数設定（フロントエンド）

`apps/web/.env.local` を作成：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## データベーススキーマ

- `trades`: 取引発生（日次/月次）
- `deliveries`: 計上/デリバリー
- `futures_curve`: 先物カーブ（0〜6M）
- `valuations`: 評価スナップショット
- `position_components`: 計算済みポジション内訳

詳細は `scripts/init.sql` を参照してください。

## 画面構成

1. **Dashboard**: KPI、ポジション内訳、先物カーブ、推移
2. **Positions**: ポジション詳細（コンポーネント内訳）
3. **Trades**: 取引一覧（フィルタ付き）
4. **Deliveries**: 計上一覧
5. **Curve & Valuation**: 先物カーブと評価スナップショット

## APIエンドポイント

- `GET /v1/dashboard?asOf=YYYY-MM-DD`
- `GET /v1/series?metric=...&from=...&to=...`
- `GET /v1/positions?asOf=YYYY-MM-DD`
- `GET /v1/trades?from=...&to=...`
- `GET /v1/deliveries?from=...&to=...`
- `GET /v1/curve?asOf=YYYY-MM-DD`
- `POST /v1/admin/seed` (開発用)

## コスト試算（MVP）

- RDS t4g.micro: 約$17-20/月
- Lambda/API Gateway/Amplify: 無料枠内想定
- **合計: 約$17-20/月**

## 詳細仕様

詳細は `指示書1224.md` を参照してください。

