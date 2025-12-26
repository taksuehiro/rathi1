# AWS Amplify デプロイ設定

## 問題: 404エラー

Amplifyでデプロイしたが404エラーが発生する場合、以下の設定を確認してください。

## 解決方法

### 1. Amplifyコンソールでの設定確認

AWS Amplifyコンソールで以下を確認：

1. **App settings** → **Build settings** を開く
2. 以下の設定を確認：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd apps/web
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: apps/web/.next
    files:
      - '**/*'
```

### 2. 環境変数の設定

**App settings** → **Environment variables** で以下を設定：

- `NEXT_PUBLIC_API_URL`: API GatewayのURL（例: `https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/v1`）

### 3. リダイレクト設定

**App settings** → **Rewrites and redirects** で以下を追加：

```json
[
  {
    "source": "/<*>",
    "target": "/index.html",
    "status": "200"
  }
]
```

または、`apps/web/public/_redirects` ファイルを作成：

```
/*    /index.html   200
```

### 4. 再デプロイ

設定を変更したら、**Redeploy this version** をクリックして再デプロイしてください。

## モノレポ構造の注意点

このプロジェクトはモノレポ構造のため、Amplifyの設定で以下を指定：

- **Root directory**: `apps/web`
- **Build command**: `npm run build`
- **Output directory**: `.next`

## トラブルシューティング

### 404エラーが続く場合

1. ビルドログを確認してエラーがないか確認
2. `.next` ディレクトリが正しく生成されているか確認
3. `apps/web/.next/standalone` が存在する場合は、`output: 'standalone'` を削除

### 環境変数が反映されない場合

- 環境変数名は `NEXT_PUBLIC_` で始まる必要があります
- 変更後は再デプロイが必要です




