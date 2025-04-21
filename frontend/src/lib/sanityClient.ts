// src/lib/sanityClient.ts
import {createClient} from '@sanity/client'

const sanityClient = createClient({
  projectId: 'wensahkh',         // ✅ ditt projekt-ID
  dataset: 'production',         // ✅ rätt dataset
  apiVersion: '2024-01-01',      // eller senaste
  useCdn: true
})

export default sanityClient
