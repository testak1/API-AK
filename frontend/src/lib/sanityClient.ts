// src/lib/sanityClient.ts
import {createClient} from '@sanity/client'

const sanityClient = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true
})

export default sanityClient
