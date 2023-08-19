import { CreateKeyPairCommand, DeleteKeyPairCommand, EC2Client, type KeyPair } from '@aws-sdk/client-ec2'
import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { cwd } from 'process'

@Injectable()
export class KeypairsService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  public async createKeypair (keyName: string): Promise<KeyPair | undefined> {
    const command = new CreateKeyPairCommand({
      KeyName: keyName,
      KeyType: 'rsa',
      KeyFormat: 'ppk'
    })

    return await this.ec2Client.send(command)
  }

  public async deleteKeypair (keyName: string): Promise<void> {
    const command = new DeleteKeyPairCommand({
      KeyName: keyName
    })

    await this.ec2Client.send(command)
  }

  public async saveKeypair (keypair: KeyPair): Promise<string> {
    const keypairId = randomUUID()
    const keypairPath = path.join(cwd(), 'keys', keypairId + '.ppk')

    await writeFile(keypairPath, keypair.KeyMaterial ?? '')

    return keypairId
  }

  public async loadKeypair (keypairId: string): Promise<string> {
    const keypairPath = path.join(cwd(), 'keys', keypairId + '.ppk')
    return (await readFile(keypairPath)).toString('utf-8')
  }
}
