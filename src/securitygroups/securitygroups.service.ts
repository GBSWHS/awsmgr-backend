import { AuthorizeSecurityGroupIngressCommand, CreateSecurityGroupCommand, DeleteSecurityGroupCommand, DescribeSecurityGroupsCommand, EC2Client, RevokeSecurityGroupIngressCommand } from '@aws-sdk/client-ec2'
import { Injectable } from '@nestjs/common'

@Injectable()
export class SecurityGroupsService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  public async createSecurityGroupId (name: string, vpcId: string, ports: number[]): Promise<string | undefined> {
    const sgCommand = new CreateSecurityGroupCommand({
      GroupName: name + '-sg',
      Description: 'this security group managed by awsmgr',
      VpcId: vpcId,
      TagSpecifications: [{
        ResourceType: 'security-group',
        Tags: [{
          Key: 'Name',
          Value: name
        }]
      }]
    })

    const sgResponse = await this.ec2Client.send(sgCommand)
    const groupId = sgResponse.GroupId

    if (groupId === undefined) {
      return undefined
    }

    for (const port of ports) {
      const ingressCommand = new AuthorizeSecurityGroupIngressCommand({
        GroupId: groupId,
        IpPermissions: [{
          FromPort: port,
          ToPort: port,
          IpProtocol: 'tcp',
          IpRanges: [{
            CidrIp: '0.0.0.0/0'
          }]
        }]
      })

      await this.ec2Client.send(ingressCommand)
    }

    return groupId
  }

  public async updateSecurityGroup (name: string, afterPorts: number[]): Promise<void> {
    const sgCommand = new DescribeSecurityGroupsCommand({
      Filters: [{
        Name: 'group-name',
        Values: [name + '-sg']
      }]
    })

    const sgResponse = await this.ec2Client.send(sgCommand)

    const groupId = sgResponse.SecurityGroups?.[0].GroupId ?? ''
    const beforeRules = sgResponse.SecurityGroups?.[0].IpPermissions ?? []
    const beforePorts = beforeRules.map((v) => v.FromPort ?? 0)

    const ports = [
      ...beforePorts,
      ...afterPorts
    ]

    for (const port of ports) {
      // Creation
      if (!beforePorts.includes(port) && afterPorts.includes(port)) {
        const createCommand = new AuthorizeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [{
            FromPort: port,
            ToPort: port,
            IpProtocol: 'tcp',
            IpRanges: [{
              CidrIp: '0.0.0.0/0'
            }]
          }]
        })

        await this.ec2Client.send(createCommand)
      }

      // Deletion
      if (beforePorts.includes(port) && !afterPorts.includes(port)) {
        const deleteCommand = new RevokeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [{
            FromPort: port,
            ToPort: port,
            IpProtocol: 'tcp',
            IpRanges: [{
              CidrIp: '0.0.0.0/0'
            }]
          }]
        })

        await this.ec2Client.send(deleteCommand)
      }
    }
  }

  public async deleteSecurityGroup (name: string): Promise<void> {
    const sgCommand = new DescribeSecurityGroupsCommand({
      Filters: [{
        Name: 'group-name',
        Values: [name + '-sg']
      }]
    })

    const sgResponse = await this.ec2Client.send(sgCommand)
    const groupId = sgResponse.SecurityGroups?.[0]?.GroupId ?? ''

    const deleteCommand = new DeleteSecurityGroupCommand({
      GroupId: groupId
    })

    await this.ec2Client.send(deleteCommand)
  }
}
