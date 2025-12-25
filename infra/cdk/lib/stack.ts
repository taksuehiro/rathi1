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
import { Construct } from "constructs"

export class RatispherdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // VPC（既存のものを lookup）
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: 'vpc-0facf3267bd1f6760',
    })

    // DB Security Group
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    })

    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL'
    )

    // RDS（既存 or 既にある前提）
    const dbInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(
      this,
      'ImportedDatabase',
      {
        instanceIdentifier: 'ratispherdstack-databaseb269d8bb-qw9ndzzggoo0',
        instanceEndpointAddress:
          'ratispherdstack-databaseb269d8bb-qw9ndzzggoo0.czicicu6kcc8.ap-northeast-1.rds.amazonaws.com',
        port: 5432,
        securityGroups: [dbSecurityGroup],
      }
    )

    const lambdaEnv = {
      DB_HOST: dbInstance.instanceEndpoint.hostname,
      DB_NAME: 'postgres',
      DB_USER: 'postgres',
      DB_PASSWORD: '<SECRET_FROM_SECRETS_MANAGER>',
    }

    // ✅ ApiAdminHandler（VPC IN）
    const apiAdminHandler = new lambda.Function(this, 'ApiAdminHandlerVPC', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('../../services/api'),
      handler: 'dist/handlers/admin-seed.handler',
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [dbSecurityGroup],
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
    })

    // ✅ ApiReadHandler（VPC IN）
    const apiReadHandler = new lambda.Function(this, 'ApiReadHandlerVPC', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('../../services/api'),
      handler: 'dist/handlers/dashboard.handler',
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [dbSecurityGroup],
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
    })

    // API Gateway (HTTP API)
    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowOrigins: ["*"], // 開発中は広めに設定
        allowMethods: [apigatewayv2.CorsHttpMethod.GET, apigatewayv2.CorsHttpMethod.POST, apigatewayv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ["Content-Type"],
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


    const adminIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      "AdminIntegration",
      apiAdminHandler
    )

    httpApi.addRoutes({
      path: "/v1/admin/seed",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: adminIntegration,
    })

    // CloudWatch Alarms
    const alarmTopic = new sns.Topic(this, "AlarmTopic", {
      displayName: "Rathispherd Alarms",
    })

    // RDS接続数アラーム
    const connectionAlarm = new cloudwatch.Alarm(this, "RdsConnectionAlarm", {
      metric: dbInstance.metricDatabaseConnections(),
      threshold: 50,
      evaluationPeriods: 1,
      alarmDescription: "RDS接続数が閾値を超えました",
    })
    connectionAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic))

    // CPUクレジットバランスアラーム（手動メトリクス作成）
    // NOTE: fromDatabaseInstanceAttributesではinstanceIdentifierが取得できないため、一時的にコメントアウト
    // const cpuCreditAlarm = new cloudwatch.Alarm(this, "RdsCpuCreditAlarm", {
    //   metric: new cloudwatch.Metric({
    //     namespace: 'AWS/RDS',
    //     metricName: 'CPUCreditBalance',
    //     dimensionsMap: {
    //       DBInstanceIdentifier: dbInstance.instanceIdentifier,
    //     },
    //     statistic: 'Average',
    //   }),
    //   threshold: 20,
    //   evaluationPeriods: 1,
    //   alarmDescription: "CPUクレジットバランスが低下しています",
    // })
    // cpuCreditAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic))

    // CPU使用率アラーム
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

    // NOTE: dbSecretが定義されていないため、一時的にコメントアウト
    // new cdk.CfnOutput(this, "DbSecretArn", {
    //   value: dbSecret.secretArn,
    //   description: "Secrets Manager ARN",
    // })
  }
}

