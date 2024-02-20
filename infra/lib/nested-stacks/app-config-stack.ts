import {
  aws_mwaa,
  aws_s3,
  CfnOutput,
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
  aws_appconfig,
} from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import {
  CfnInstanceProfile,
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

interface AppConfigStackProps<T extends Object> extends NestedStackProps {
  name: string;
  configContent: T;
}

export class AppConfigStack<T extends Object> extends NestedStack {
  constructor(scope: Construct, id: string, props: AppConfigStackProps<T>) {
    super(scope, id, props);

    const { name, configContent } = props;

    const appConfigApplication = new aws_appconfig.CfnApplication(
      this,
      `${name}-AppConfigApplication`,
      {
        name: `${name}-AppConfigApplication`,
      }
    );

    const appConfigEnvironment = new aws_appconfig.CfnEnvironment(
      this,
      `${name}-AppConfigEnvironment`,
      {
        applicationId: appConfigApplication.ref,
        name: `${name}-AppConfigEnvironment`,
      }
    );

    const appConfigConfigProfile = new aws_appconfig.CfnConfigurationProfile(
      this,
      `${name}-AppConfigConfigProfile`,
      {
        applicationId: appConfigApplication.ref,
        locationUri: "hosted",
        name: `${name}-AppConfigConfigProfile`,
        type: "AWS.Freeform",
      }
    );

    const appConfigHostedConfigVersion =
      new aws_appconfig.CfnHostedConfigurationVersion(
        this,
        `${name}-AppConfigHostedConfigVersion`,
        {
          applicationId: appConfigApplication.ref,
          configurationProfileId: appConfigConfigProfile.ref,
          content: JSON.stringify(configContent),
          contentType: "application/json",
        }
      );

    new aws_appconfig.CfnDeployment(this, `${name}-AppConfigDeployment`, {
      applicationId: appConfigApplication.ref,
      configurationProfileId: appConfigConfigProfile.ref,
      configurationVersion: appConfigHostedConfigVersion.ref,
      deploymentStrategyId: "AppConfig.AllAtOnce",
      environmentId: appConfigEnvironment.ref,
    });
  }
}
