// schemaTypes/brand.ts
import {defineType, defineField, defineArrayMember} from 'sanity'

export const brand = defineType({
  name: 'brand',
  type: 'document',
  title: 'Brand',
  fields: [
    defineField({ name: 'name', type: 'string', title: 'Brand name' }),
    defineField({
      name: 'models',
      type: 'array',
      title: 'Models',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'modelRecord',
          title: 'Model',
          fields: [
            defineField({ name: 'name', type: 'string', title: 'Model name' }),
            defineField({
              name: 'years',
              type: 'array',
              title: 'Years',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'yearRecord',
                  title: 'Year range',
                  fields: [
                    defineField({ name: 'range', type: 'string', title: 'Range (e.g. 2012→2016)' }),
                    defineField({
                      name: 'engines',
                      type: 'array',
                      title: 'Engines',
                      of: [
                        defineArrayMember({
                          type: 'object',
                          name: 'engineRecord',
                          title: 'Engine',
                          fields: [
                            defineField({ name: 'fuel',  type: 'string',  title: 'Fuel type' }),
                            defineField({ name: 'label', type: 'string',  title: 'Engine label' }),
                            defineField({
                              name: 'stages',
                              type: 'array',
                              title: 'Tuning stages',
                              of: [
                                defineArrayMember({
                                  type: 'object',
                                  name: 'stageRecord',
                                  title: 'Stage',
                                  fields: [
                                    defineField({ name: 'name',     type: 'string',  title: 'Stage name' }),
                                    defineField({ name: 'origHk',   type: 'number',  title: 'Original hk' }),
                                    defineField({ name: 'tunedHk',  type: 'number',  title: 'Optimized hk' }),
                                    defineField({ name: 'origNm',   type: 'number',  title: 'Original Nm' }),
                                    defineField({ name: 'tunedNm',  type: 'number',  title: 'Optimized Nm' }),
                                    defineField({ name: 'price',    type: 'number',  title: 'Price (SEK)' }),
                                  ]
                                })
                              ]
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  ]
})
