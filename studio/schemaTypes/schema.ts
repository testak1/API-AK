// schemaTypes/schema.ts
import { defineSchema } from 'sanity'
import { brand } from './brand'

export default defineSchema({
  name: 'default',
  types: [ brand ]     // add other types here as you grow
})
