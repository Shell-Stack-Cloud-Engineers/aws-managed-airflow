import { NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  CfnInstanceProfile,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

interface SharedResourcesStackProps extends NestedStackProps {}

export class SharedResourcesStack extends NestedStack {
  public bigDataBucket: Bucket;

  constructor(scope: Construct, id: string, props: SharedResourcesStackProps) {
    super(scope, id, props);

    this.bigDataBucket = new Bucket(this, "BigDataBucket", {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
