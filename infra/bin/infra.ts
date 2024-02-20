#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";
import config from "../config/config";

const app = new cdk.App();
new InfraStack(app, "InfraStack", {
  env: { account: config.account, region: config.region },
});
