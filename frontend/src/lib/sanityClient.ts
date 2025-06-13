// src/lib/sanityClient.ts
import {createClient} from '@sanity/client'

const sanityClient = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2025-04-23',
  useCdn: false
})

export default sanityClient
