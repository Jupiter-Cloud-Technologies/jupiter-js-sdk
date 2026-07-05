import { JupiterStorage } from '@jupiter-cloud/storage'

const endpoint = process.env.JUPITER_STORAGE_URL ?? 'http://localhost:8787'
const projectId = process.env.JUPITER_PROJECT_ID
const token = process.env.JUPITER_TOKEN

if (!projectId) {
  throw new Error('JUPITER_PROJECT_ID is required')
}

const storage = new JupiterStorage(endpoint, {
  projectId,
  token
})

const { data, error } = await storage.listBuckets()

if (error) {
  throw new Error(error.detail)
}

console.log(data)
