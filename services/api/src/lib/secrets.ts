import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({})

export async function getDbCredentials() {
  const secretName = process.env.DB_SECRET_NAME || 'rathi/db/credentials'
  
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    )
    
    if (response.SecretString) {
      return JSON.parse(response.SecretString)
    }
    throw new Error('Secret value is not a string')
  } catch (error) {
    console.error('Failed to get secret:', error)
    throw error
  }
}




