import {
  CfnOutput,
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnCluster } from "aws-cdk-lib/aws-emr";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  CfnInstanceProfile,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { v4 as uuid } from "uuid";

/**
 * @link https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-release-app-versions-6.x.html
 */
type EmrReleaseVersion =
  | "emr-6.14.0"
  | "emr-6.13.0"
  | "emr-6.12.0"
  | "emr-6.11.0";

export enum EmrApplication {
  FLINK = "Flink",
  GANGLIA = "Ganglia",
  HADOOP = "Hadoop",
  HBASE = "HBase",
  HCATALOG = "HCatalog",
  JUPYTER_HUB = "JupyterHub",
  LIVY = "Livy",
  MAHOUT = "Mahout",
  MXNET = "MXNet",
  PHOENIX = "Phoenix",
  PIG = "Pig",
  SPARK = "Spark",
  SQOOP = "Sqoop",
  TEZ = "Tex",
  TENSORFLOW = "TensorFlow",
  ZEPPELIN = "Zeppelin",
  ZOOKEEPER = "Zookeeper",
}

interface EmrConfig {
  emrClusterBucket?: Bucket;
  emrApplications: EmrApplication[];
  clusterConfig: {
    name?: string;
    emrReleaseVersion?: EmrReleaseVersion;
    coreInstanceGroup: {
      instanceCount: number;
      instanceType: InstanceType;
    };
    taskInstanceGroup: {
      instanceCount: number;
      instanceType: InstanceType;
    };
    masterInstanceGroup: {
      instanceCount: number;
      instanceType: InstanceType;
    };
  };
}
interface EmrStackProps extends NestedStackProps {
  vpc: Vpc;
  emrConfig?: EmrConfig;
}

export class EmrStack extends NestedStack {
  public emrClusterBucket: Bucket;
  public emrCluster: CfnCluster;
  public emrServiceRole: Role;
  private ec2EmrServiceRole: Role;
  public ec2EmrInstanceProfile: CfnInstanceProfile;
  private emrPrimaryNodeSecurityGroup: SecurityGroup;
  private emrCoreAndTaskNodesSecurityGroup: SecurityGroup;
  private emrServiceAccessSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: EmrStackProps) {
    super(scope, id, props);

    const { vpc, emrConfig } = props;

    this.emrServiceRole = new Role(this, `EmrServiceRole`, {
      assumedBy: new ServicePrincipal("elasticmapreduce.amazonaws.com"),
      roleName: "emr-service-role",
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          "EmrManagedPolicy",
          "arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceRole"
        ),
      ],
    });

    this.ec2EmrServiceRole = new Role(this, `Ec2EmrServiceRole`, {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      roleName: "ec2-emr-service-role",
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          "Ec2EmrManagedPolicy",
          "arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceforEC2Role"
        ),
      ],
    });

    this.ec2EmrInstanceProfile = new CfnInstanceProfile(
      this,
      "Ec2InstanceProfile",
      {
        roles: [this.ec2EmrServiceRole.roleName],
        instanceProfileName: this.ec2EmrServiceRole.roleName,
      }
    );

    if (emrConfig) {
      const { clusterConfig, emrClusterBucket, emrApplications } = emrConfig;
      this.emrClusterBucket = emrClusterBucket
        ? emrClusterBucket
        : new Bucket(this, "EmrClusterBucket", {
            publicReadAccess: false,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
          });

      const coreInstanceGroup: CfnCluster.InstanceGroupConfigProperty = {
        instanceCount: clusterConfig.coreInstanceGroup.instanceCount,
        instanceType: clusterConfig.coreInstanceGroup.instanceType.toString(),
        name: "core-instance-group",
      };

      const taskInstanceGroup: CfnCluster.InstanceGroupConfigProperty = {
        instanceCount: clusterConfig.taskInstanceGroup.instanceCount,
        instanceType: clusterConfig.taskInstanceGroup.instanceType.toString(),
        name: "task-instance-group",
      };

      const masterInstanceGroup: CfnCluster.InstanceGroupConfigProperty = {
        instanceCount: clusterConfig.masterInstanceGroup.instanceCount,
        instanceType: clusterConfig.masterInstanceGroup.instanceType.toString(),
        name: "master-instance-group",
      };

      // Security Groups
      this.emrPrimaryNodeSecurityGroup = new SecurityGroup(
        this,
        "EmrPrimaryNodeSecurityGroup",
        {
          vpc,
          allowAllOutbound: true,
          description: "Security group for EMR Cluster Primary Node",
        }
      );

      // TODO: Tighten up traffic rule
      this.emrPrimaryNodeSecurityGroup.addIngressRule(
        Peer.anyIpv4(),
        Port.allTraffic()
      );

      this.emrCoreAndTaskNodesSecurityGroup = new SecurityGroup(
        this,
        "EmrCoreAndTaskNodesSecurityGroup",
        {
          vpc,
          allowAllOutbound: true,
          description: "Security group for EMR Cluster Core and Task Nodes",
        }
      );

      this.emrServiceAccessSecurityGroup = new SecurityGroup(
        this,
        "EmrServiceAccessSecurityGroup",
        {
          vpc,
          allowAllOutbound: true,
          description: "Security group for EMR Cluster Service Access",
        }
      );

      this.emrServiceAccessSecurityGroup.addIngressRule(
        Peer.securityGroupId(this.emrPrimaryNodeSecurityGroup.securityGroupId),
        Port.tcp(9443)
      );

      const clusterName =
        emrConfig.clusterConfig.name ?? `emr-cluster-${uuid().split("-")[0]}`;
      this.emrCluster = new CfnCluster(this, "EmrCluster", {
        name: clusterName,
        releaseLabel: clusterConfig.emrReleaseVersion ?? "emr-6.14.0",
        instances: {
          coreInstanceGroup,
          masterInstanceGroup,
          taskInstanceGroups: [taskInstanceGroup],
          keepJobFlowAliveWhenNoSteps: true,
          ec2SubnetId: vpc.privateSubnets[0].subnetId,
          emrManagedMasterSecurityGroup:
            this.emrPrimaryNodeSecurityGroup.securityGroupId,
          emrManagedSlaveSecurityGroup:
            this.emrCoreAndTaskNodesSecurityGroup.securityGroupId,
          serviceAccessSecurityGroup:
            this.emrServiceAccessSecurityGroup.securityGroupId,
          terminationProtected: false,
        },
        jobFlowRole:
          this.ec2EmrInstanceProfile.instanceProfileName ?? "UNKNOWN",
        serviceRole: this.emrServiceRole.roleName,
        logUri: `s3://${this.emrClusterBucket.bucketName}/${clusterName}-logs`,
        applications: emrApplications.map((application) => ({
          name: application,
        })),
      });
    }
  }
}
