# ローカル開発環境セットアップ

## 前提条件

- Node.js 20以上
- Docker Desktop（PostgreSQL用）
- npm または pnpm

## セットアップ手順

### 1. データベース起動

```bash
# Docker ComposeでPostgreSQLを起動
docker-compose up -d

# 起動確認
docker ps
```

### 2. ダミーデータ生成

```bash
cd scripts
npm install
npm run seed
```

### 3. APIサーバー起動

```bash
cd services/api
npm install
npm run build
npm run dev
```

APIサーバーは `http://localhost:3001` で起動します。

### 4. フロントエンド起動

別のターミナルで：

```bash
cd apps/web
npm install
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

## トラブルシューティング

### エラー: "Failed to fetch dashboard"

**原因**: データベースが起動していない、またはAPIサーバーが起動していない

**解決方法**:

1. PostgreSQLが起動しているか確認:
   ```bash
   docker ps
   ```
   
2. 起動していない場合:
   ```bash
   docker-compose up -d
   ```

3. APIサーバーが起動しているか確認:
   - ブラウザで `http://localhost:3001/v1/dashboard?asOf=2026-07-05` にアクセス
   - エラーが表示される場合は、APIサーバーを再起動

4. データベースにデータがあるか確認:
   ```bash
   cd scripts
   npm run seed
   ```

### エラー: "データベースに接続できません"

**原因**: PostgreSQLへの接続設定が間違っている

**解決方法**:

1. `docker-compose.yml` の設定を確認
2. 環境変数を確認:
   - `DB_HOST=localhost`
   - `DB_NAME=rathi_tin`
   - `DB_USER=postgres`
   - `DB_PASSWORD=localpassword`

### Dockerがインストールされていない場合

Docker Desktopをインストールするか、ローカルのPostgreSQLを使用してください。

ローカルPostgreSQLを使用する場合:
- `services/api/src/local-server.ts` の環境変数をローカルのPostgreSQL設定に合わせて変更





