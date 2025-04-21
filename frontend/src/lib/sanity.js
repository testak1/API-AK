// lib/sanity.js
import {createClient} from '@sanity/client'

export const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset:   process.env.SANITY_DATASET,
  useCdn:    process.env.SANITY_USE_CDN === 'true',
  apiVersion: process.env.SANITY_API_VERSION,
})
