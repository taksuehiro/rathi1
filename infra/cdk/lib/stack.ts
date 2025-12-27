import * as cdk from "aws-cdk-lib"
import * as rds from "aws-cdk-lib/aws-rds"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2"
import * as apigatewayv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch"
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions"
import * as sns from "aws-cdk-lib/aws-sns"
import * as iam from "aws-cdk-lib/aws-iam"
import { Construct } from "constructs"
import * as path from "path"

export class RatispherdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // VPC作成（プライベートサブネット + NAT Gateway）
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1, // NAT Gateway追加（月額約$32）
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    })

    // Lambda用セキュリティグループ
    const lambdaSG = new ec2.SecurityGroup(this, "LambdaSG", {
      vpc,
      description: "Security group for Lambda functions",
      allowAllOutbound: true,
    })

    // DB用セキュリティグループ
    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: "Security group for RDS PostgreSQL",
      allowAllOutbound: true,
    })

    // RDS: Lambda SGからのアクセスのみ許可
    dbSecurityGroup.addIngressRule(
      lambdaSG,
      ec2.Port.tcp(5432),
      'Allow Lambda access from VPC'
    )

    // Secrets Manager: DB認証情報
    const dbSecret = new secretsmanager.Secret(this, "DbSecret", {
      secretName: "rathi/db/credentials",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "postgres" }),
        generateStringKey: "password",
        excludeCharacters: '"@/\\',
      },
    })

    // RDS PostgreSQL 16 (t4g.micro) - プライベートサブネット
    const dbInstance = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: "rathi_tin",
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      publiclyAccessible: false, // プライベート接続
    })

    // Lambda関数: API Read (GET系) - VPC内
    const apiReadHandler = new lambda.Function(this, "ApiReadHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/dashboard.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../services/api/dist")
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSG],
      environment: {
        DB_SECRET_NAME: dbSecret.secretName,
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_NAME: "rathi_tin",
        DB_USER: "postgres",
        DB_PASSWORD: dbSecret.secretValueFromJson("password").unsafeUnwrap(),
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    })

    dbSecret.grantRead(apiReadHandler)

    // Lambda関数: Explain (AI分析) - VPC内
    const explainHandler = new lambda.Function(this, "ExplainHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/explain.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../services/api/dist")
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSG],
      environment: {
        DB_SECRET_NAME: dbSecret.secretName,
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_NAME: "rathi_tin",
        DB_USER: "postgres",
        DB_PASSWORD: dbSecret.secretValueFromJson("password").unsafeUnwrap(),
      },
      timeout: cdk.Duration.seconds(30), // Bedrock呼び出しのため長めに
      memorySize: 512,
    })

    dbSecret.grantRead(explainHandler)

    // Bedrock権限追加（本番環境用）
    explainHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          'arn:aws:bedrock:ap-northeast-1::foundation-model/anthropic.claude-sonnet-4-20250514',
        ],
      })
    )

    // Lambda関数: API Admin (seed) - VPC内
    const apiAdminHandler = new lambda.Function(this, "ApiAdminHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/admin-seed.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../services/api/dist")
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSG],
      environment: {
        DB_SECRET_NAME: dbSecret.secretName,
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_NAME: "rathi_tin",
        DB_USER: "postgres",
        DB_PASSWORD: dbSecret.secretValueFromJson("password").unsafeUnwrap(),
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    })

    dbSecret.grantRead(apiAdminHandler)

    // Lambda関数: Schema Init - VPC内
    const schemaInitHandler = new lambda.Function(this, "SchemaInitHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/admin-init-schema.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../services/api/dist")
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSG],
      environment: {
        DB_SECRET_NAME: dbSecret.secretName,
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_NAME: "rathi_tin",
        DB_USER: "postgres",
        DB_PASSWORD: dbSecret.secretValueFromJson("password").unsafeUnwrap(),
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    })

    dbSecret.grantRead(schemaInitHandler)

    // API Gateway (HTTP API)
    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS
        ],
        allowHeaders: ["Content-Type", "Authorization"],
        maxAge: cdk.Duration.days(1),
      },
    })

    // ルート追加
    const dashboardIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      "DashboardIntegration",
      apiReadHandler
    )

    httpApi.addRoutes({
      path: "/v1/dashboard",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: dashboardIntegration,
    })

    httpApi.addRoutes({
      path: "/v1/trades",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: dashboardIntegration,
    })

    httpApi.addRoutes({
      path: "/v1/deliveries",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: dashboardIntegration,
    })

    httpApi.addRoutes({
      path: "/v1/positions",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: dashboardIntegration,
    })

    httpApi.addRoutes({
      path: "/v1/curve",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: dashboardIntegration,
    })

    httpApi.addRoutes({
      path: "/v1/series",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: dashboardIntegration,
    })

    httpApi.addRoutes({
      path: "/v1/limits",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: dashboardIntegration,
    })

    httpApi.addRoutes({
      path: "/v1/limits/status",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: dashboardIntegration,
    })

    const adminIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      "AdminIntegration",
      apiAdminHandler
    )

    httpApi.addRoutes({
      path: "/v1/admin/seed",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: adminIntegration,
    })

    const schemaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      "SchemaIntegration",
      schemaInitHandler
    )

    httpApi.addRoutes({
      path: "/v1/admin/init-schema",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: schemaIntegration,
    })

    // Explain Integration
    const explainIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      "ExplainIntegration",
      explainHandler
    )

    httpApi.addRoutes({
      path: "/v1/explain/dashboard",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: explainIntegration,
    })

    // CloudWatch Alarms
    const alarmTopic = new sns.Topic(this, "AlarmTopic", {
      displayName: "Rathispherd Alarms",
    })

    const connectionAlarm = new cloudwatch.Alarm(this, "RdsConnectionAlarm", {
      metric: dbInstance.metricDatabaseConnections(),
      threshold: 50,
      evaluationPeriods: 1,
      alarmDescription: "RDS接続数が閾値を超えました",
    })
    connectionAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic))

    const cpuCreditAlarm = new cloudwatch.Alarm(this, "RdsCpuCreditAlarm", {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUCreditBalance',
        dimensionsMap: {
          DBInstanceIdentifier: dbInstance.instanceIdentifier,
        },
        statistic: 'Average',
      }),
      threshold: 20,
      evaluationPeriods: 1,
      alarmDescription: "CPUクレジットバランスが低下しています",
    })
    cpuCreditAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic))

    const cpuAlarm = new cloudwatch.Alarm(this, "RdsCpuAlarm", {
      metric: dbInstance.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: "CPU使用率が高くなっています",
    })
    cpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic))

    // 出力
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.url!,
      description: "API Gateway URL",
    })

    new cdk.CfnOutput(this, "DbEndpoint", {
      value: dbInstance.dbInstanceEndpointAddress,
      description: "RDS PostgreSQL Endpoint",
    })

    new cdk.CfnOutput(this, "DbSecretArn", {
      value: dbSecret.secretArn,
      description: "Secrets Manager ARN",
    })
  }
}
