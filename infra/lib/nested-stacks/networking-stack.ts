import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  BastionHostLinux,
  CfnKeyPair,
  GatewayVpcEndpointAwsService,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";

interface NetworkingStackProps extends NestedStackProps {
  deployBastionHost?: boolean;
}

export class NetworkingStack extends NestedStack {
  public vpc: Vpc;
  public bastionHostSecurityGroup?: SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkingStackProps) {
    super(scope, id, props);
    const { deployBastionHost } = props;

    const vpc = new Vpc(this, "BigDataVpc", {
      vpcName: "big-data-vpc",
      subnetConfiguration: [
        {
          name: "big-data-vpc-public-subnet",
          subnetType: SubnetType.PUBLIC,
        },
        {
          name: "big-data-vpc-private-subnet",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    vpc.addGatewayEndpoint("s3-gateway-endpoint", {
      service: GatewayVpcEndpointAwsService.S3,
    });

    if (deployBastionHost) {
      const bastionHostSecurityGroup = new SecurityGroup(
        this,
        "EmrOpenSecurityGroup",
        {
          vpc,
          allowAllOutbound: true,
          description: "Security group for EMR Open Access",
        }
      );
      this.bastionHostSecurityGroup = bastionHostSecurityGroup;
      new BastionHostLinux(this, "EmrBastionHost", {
        vpc,
        instanceName: "emr-bastion-host",
        subnetSelection: {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroup: bastionHostSecurityGroup,
      });
    }

    this.vpc = vpc;
  }
}
