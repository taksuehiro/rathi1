# AI-Ratispherd CDK Infrastructure

AWS CDKを使用したインフラストラクチャ定義です。

## デプロイ前の準備

1. AWS CLIの設定
2. CDKブートストラップ（初回のみ）
   ```bash
   npx cdk bootstrap
   ```

## デプロイ

```bash
cd infra/cdk
npm install
npm run build
npx cdk deploy
```

## スタックの削除

```bash
npx cdk destroy
```

## 注意事項

- RDSはパブリックサブネットに配置されています（開発環境用）
- 本番環境では適切なセキュリティ設定を行ってください
- Lambda Layer (`layers/pg`) は別途作成が必要です



