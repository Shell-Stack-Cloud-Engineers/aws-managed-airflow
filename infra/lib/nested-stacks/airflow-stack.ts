import {
  aws_mwaa,
  aws_s3,
  CfnOutput,
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { v4 as uuid } from "uuid";

interface AirflowStackProps extends NestedStackProps {
  vpc: Vpc;
  airflowName?: string;
  airflowBucket?: Bucket;
}

export class AirflowStack extends NestedStack {
  public airflowBucket: Bucket;
  public airflowExecutionRole: Role;
  public airflowSecurityGroup: SecurityGroup;
  constructor(scope: Construct, id: string, props: AirflowStackProps) {
    super(scope, id, props);

    let { vpc, airflowName, airflowBucket } = props;

    if (airflowName == undefined) {
      airflowName = `airflow${uuid().split("-")[0]}`;
    }

    this.airflowBucket = airflowBucket
      ? airflowBucket
      : new aws_s3.Bucket(this, `${airflowName}-AirflowBucket`, {
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          removalPolicy: RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
        });

    const airflowEnvironmentName = `${airflowName}-AirflowEnvironment`;

    // Define Airflow Execution Role - Allow airflow to interact AWS resources
    this.airflowExecutionRole = new Role(
      this,
      `${airflowName}-AirflowExecutionRole`,
      {
        assumedBy: new ServicePrincipal("airflow-env.amazonaws.com"),
      }
    );

    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: ["appconfig:*"],
        resources: [`*`],
        effect: Effect.ALLOW,
      })
    );

    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        resources: [
          `arn:aws:airflow:${this.region}:${this.account}:environment/${airflowEnvironmentName}`,
        ],
        actions: ["airflow:PublishMetrics"],
        effect: Effect.ALLOW,
      })
    );
    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        resources: [
          `arn:aws:s3:::${this.airflowBucket.bucketName}`,
          `arn:aws:s3:::${this.airflowBucket.bucketName}/*`,
        ],
        actions: ["s3:ListAllMyBuckets"],
        effect: Effect.DENY,
      })
    );
    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        resources: [
          `arn:aws:s3:::${this.airflowBucket.bucketName}`,
          `arn:aws:s3:::${this.airflowBucket.bucketName}/*`,
        ],
        actions: ["s3:*"],
        effect: Effect.ALLOW,
      })
    );
    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:airflow-${airflowEnvironmentName}-*`,
        ],
        actions: [
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:GetLogRecord",
          "logs:GetLogGroupFields",
          "logs:GetQueryResults",
          "logs:DescribeLogGroups",
        ],
        effect: Effect.ALLOW,
      })
    );
    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        resources: [`*`],
        actions: ["cloudwatch:PutMetricData"],
        effect: Effect.ALLOW,
      })
    );
    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        resources: [`arn:aws:sqs:${this.region}:*:airflow-celery-*`],
        actions: [
          "sqs:ChangeMessageVisibility",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ReceiveMessage",
          "sqs:SendMessage",
        ],
        effect: Effect.ALLOW,
      })
    );
    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey*",
          "kms:Encrypt",
        ],
        notResources: [`arn:aws:kms:*:${this.account}:key/*`],
        conditions: {
          StringLike: {
            "kms:ViaService": ["sqs.eu-west-1.amazonaws.com"],
          },
        },
      })
    );
    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`*`],
        actions: [
          "elasticmapreduce:RunJobFlow",
          "elasticmapreduce:AddInstanceFleet",
          "elasticmapreduce:AddInstanceGroups",
          "elasticmapreduce:AddJobFlowSteps",
          "elasticmapreduce:AddTags",
          "elasticmapreduce:CancelSteps",
          "elasticmapreduce:CreateEditor",
          "elasticmapreduce:CreateSecurityConfiguration",
          "elasticmapreduce:DeleteEditor",
          "elasticmapreduce:DeleteSecurityConfiguration",
          "elasticmapreduce:DescribeCluster",
          "elasticmapreduce:DescribeEditor",
          "elasticmapreduce:DescribeJobFlows",
          "elasticmapreduce:DescribeSecurityConfiguration",
          "elasticmapreduce:DescribeStep",
          "elasticmapreduce:DescribeReleaseLabel",
          "elasticmapreduce:GetBlockPublicAccessConfiguration",
          "elasticmapreduce:GetManagedScalingPolicy",
          "elasticmapreduce:GetAutoTerminationPolicy",
          "elasticmapreduce:ListBootstrapActions",
          "elasticmapreduce:ListClusters",
          "elasticmapreduce:ListEditors",
          "elasticmapreduce:ListInstanceFleets",
          "elasticmapreduce:ListInstanceGroups",
          "elasticmapreduce:ListInstances",
          "elasticmapreduce:ListSecurityConfigurations",
          "elasticmapreduce:ListSteps",
          "elasticmapreduce:ListSupportedInstanceTypes",
          "elasticmapreduce:ModifyCluster",
          "elasticmapreduce:ModifyInstanceFleet",
          "elasticmapreduce:ModifyInstanceGroups",
          "elasticmapreduce:OpenEditorInConsole",
          "elasticmapreduce:PutAutoScalingPolicy",
          "elasticmapreduce:PutBlockPublicAccessConfiguration",
          "elasticmapreduce:PutManagedScalingPolicy",
          "elasticmapreduce:RemoveAutoScalingPolicy",
          "elasticmapreduce:RemoveManagedScalingPolicy",
          "elasticmapreduce:RemoveTags",
          "elasticmapreduce:SetTerminationProtection",
          "elasticmapreduce:StartEditor",
          "elasticmapreduce:StopEditor",
          "elasticmapreduce:TerminateJobFlows",
          "elasticmapreduce:ViewEventsFromAllClustersInConsole",
        ],
      })
    );

    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:aws:iam::${this.account}:role/emr-service-role`,
          `arn:aws:iam::${this.account}:role/ec2-emr-service-role`,
        ],
        actions: ["iam:PassRole"],
      })
    );

    this.airflowExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`arn:aws:emr-serverless:eu-west-1:${this.account}:/*`],
        actions: [
          "emr-serverless:CreateApplication",
          "emr-serverless:StartApplication",
          "emr-serverless:UpdateApplication",
          "emr-serverless:StopApplication",
          "emr-serverless:StartJobRun",
          "emr-serverless:StopJobRun",
          "emr-serverless:UntagResource",
        ],
      })
    );

    //Security Group

    this.airflowSecurityGroup = new SecurityGroup(
      this,
      "ManagedAirflowSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for Managed Airflow",
      }
    );

    this.airflowSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic());

    //Managed Airflow

    new aws_mwaa.CfnEnvironment(this, "ManagedAirflow", {
      name: airflowEnvironmentName,
      sourceBucketArn: this.airflowBucket.bucketArn,
      dagS3Path: "dags",
      requirementsS3Path: "dags/requirements.txt",
      networkConfiguration: {
        securityGroupIds: [this.airflowSecurityGroup.securityGroupId],
        subnetIds: [
          vpc.privateSubnets.map((subnet) => subnet.subnetId)[0],
          vpc.privateSubnets.map((subnet) => subnet.subnetId)[1],
        ],
      },
      executionRoleArn: this.airflowExecutionRole.roleArn,
      webserverAccessMode: "PUBLIC_ONLY",
      loggingConfiguration: {
        dagProcessingLogs: { enabled: true, logLevel: "INFO" },
        schedulerLogs: { enabled: true, logLevel: "INFO" },
        taskLogs: { enabled: true, logLevel: "INFO" },
        webserverLogs: { enabled: true, logLevel: "INFO" },
        workerLogs: { enabled: true, logLevel: "INFO" },
      },
    });

    new CfnOutput(this, "AirflowBucketName", {
      exportName: "airflowBucketName",
      value: this.airflowBucket.bucketName,
      description: "Bucket where airflow dags and requirements are stored",
    });
  }
}
