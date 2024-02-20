import { EC2 } from "aws-sdk";

const main = async () => {
  const ec2 = new EC2({ region: "eu-west-1" });

  const securityGroups = await ec2.describeSecurityGroups().promise();
  const { SecurityGroupRules: securityGroupsRules } = await ec2
    .describeSecurityGroupRules()
    .promise();
  const groupIdToSecurityGroupRuleIdMapIngress = securityGroupsRules?.reduce(
    (previousValue, currentValue, currentIndex, array) => {
      if (
        currentValue.GroupId !== undefined &&
        currentValue.SecurityGroupRuleId !== undefined &&
        currentValue.IsEgress === false
      ) {
        const existingSecurityGroupRuleIds: string[] =
          previousValue.get(currentValue.GroupId) ?? [];
        existingSecurityGroupRuleIds.push(currentValue.SecurityGroupRuleId);
        previousValue.set(currentValue.GroupId, existingSecurityGroupRuleIds);
      }
      return previousValue;
    },
    new Map<string, string[]>()
  );

  const groupIdToSecurityGroupRuleIdMapEgress = securityGroupsRules?.reduce(
    (previousValue, currentValue, currentIndex, array) => {
      if (
        currentValue.GroupId !== undefined &&
        currentValue.SecurityGroupRuleId !== undefined &&
        currentValue.IsEgress === true
      ) {
        const existingSecurityGroupRuleIds: string[] =
          previousValue.get(currentValue.GroupId) ?? [];
        existingSecurityGroupRuleIds.push(currentValue.SecurityGroupRuleId);
        previousValue.set(currentValue.GroupId, existingSecurityGroupRuleIds);
      }
      return previousValue;
    },
    new Map<string, string[]>()
  );

  for (const securityGroup of securityGroups.SecurityGroups ?? []) {
    if (
      securityGroup.GroupId !== undefined &&
      securityGroup.VpcId == "vpc-077a4a02097870568"
    ) {
      const securityGroupRuleId = groupIdToSecurityGroupRuleIdMapIngress?.get(
        securityGroup.GroupId
      );
      if (
        securityGroupRuleId != undefined &&
        groupIdToSecurityGroupRuleIdMapIngress != undefined
      ) {
        const revokeSecurityGroupResponse = await ec2
          .revokeSecurityGroupIngress({
            GroupId: securityGroup.GroupId,
            SecurityGroupRuleIds: groupIdToSecurityGroupRuleIdMapIngress.get(
              securityGroup.GroupId
            ),
          })
          .promise();
        console.log(revokeSecurityGroupResponse);
      }
    }
  }
  // console.log(groupIdToSecurityGroupRuleIdMap)
  for (const securityGroup of securityGroups.SecurityGroups ?? []) {
    if (
      securityGroup.GroupId !== undefined &&
      securityGroup.VpcId == "vpc-077a4a02097870568"
    ) {
      const securityGroupRuleId = groupIdToSecurityGroupRuleIdMapEgress?.get(
        securityGroup.GroupId
      );
      if (
        securityGroupRuleId != undefined &&
        groupIdToSecurityGroupRuleIdMapEgress != undefined
      ) {
        const revokeSecurityGroupResponse = await ec2
          .revokeSecurityGroupEgress({
            GroupId: securityGroup.GroupId,
            SecurityGroupRuleIds: groupIdToSecurityGroupRuleIdMapEgress.get(
              securityGroup.GroupId
            ),
          })
          .promise();
        console.log(revokeSecurityGroupResponse);
      }
    }
  }

  for (const securityGroup of securityGroups.SecurityGroups ?? []) {
    if (
      securityGroup.GroupId !== undefined &&
      securityGroup.VpcId == "vpc-077a4a02097870568"
    ) {
      const result = await ec2
        .deleteSecurityGroup({
          GroupId: securityGroup.GroupId,
        })
        .promise();
      console.log(result);
    }
  }
};

(() => {
  main();
})();
