// schemaTypes/brand.ts
import { defineType, defineField, defineArrayMember } from 'sanity';
import { stageDescription } from './stageDescription';
import { aktPlus } from './aktPlus';

export const brand = defineType({
  name: 'brand',
  type: 'document',
  title: 'Brand',
  fields: [
    defineField({ 
      name: 'name', 
      type: 'string', 
      title: 'Brand name',
      validation: Rule => Rule.required()
    }),
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
            defineField({ 
              name: 'name', 
              type: 'string', 
              title: 'Model name',
              validation: Rule => Rule.required()
            }),
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
                    defineField({ 
                      name: 'range', 
                      type: 'string', 
                      title: 'Range (e.g. 2012→2016)',
                      validation: Rule => Rule.required()
                    }),
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
                            defineField({ 
                              name: 'fuel',  
                              type: 'string',  
                              title: 'Fuel type',
                              validation: Rule => Rule.required()
                            }),
                            defineField({ 
                              name: 'label', 
                              type: 'string',  
                              title: 'Engine label',
                              validation: Rule => Rule.required()
                            }),
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
                                    defineField({ 
                                      name: 'name',     
                                      type: 'string',  
                                      title: 'Stage name',
                                      validation: Rule => Rule.required()
                                    }),
                                    defineField({
                                      name: 'descriptionRef',
                                      type: 'reference',
                                      title: 'Stage Description',
                                      to: [{ type: 'stageDescription' }],
                                      options: {
                                        filter: ({ parent }) => ({
                                          filter: 'stageName == $stageName',
                                          params: { stageName: parent?.name || "" }
                                        }),
                                        disableNew: true
                                      },
                                      validation: Rule => Rule.required()
                                    }),
                                    // Fixed AKT+ options reference
                                    defineField({
                                      name: 'aktPlusOptions',
                                      type: 'array',
                                      title: 'AKT+ Options',
                                      of: [
                                        defineArrayMember({
                                          type: 'reference',
                                          to: [{ type: 'aktPlus' }],
                                          options: {
                                            filter: ({ parent }) => ({
                                              filter: '!defined(stage) || stage == $stageName',
                                              params: { stageName: parent?.name || "" }
                                            })
                                          }
                                        })
                                      ]
                                    }),
                                    defineField({ 
                                      name: 'origHk',   
                                      type: 'number',  
                                      title: 'Original hk',
                                      validation: Rule => Rule.required().min(0)
                                    }),
                                    defineField({ 
                                      name: 'tunedHk',  
                                      type: 'number',  
                                      title: 'Optimized hk',
                                      validation: Rule => Rule.required().min(0)
                                    }),
                                    defineField({ 
                                      name: 'origNm',   
                                      type: 'number',  
                                      title: 'Original Nm',
                                      validation: Rule => Rule.required().min(0)
                                    }),
                                    defineField({ 
                                      name: 'tunedNm',  
                                      type: 'number',  
                                      title: 'Optimized Nm',
                                      validation: Rule => Rule.required().min(0)
                                    }),
                                    defineField({ 
                                      name: 'price',    
                                      type: 'number',  
                                      title: 'Price (SEK)',
                                      validation: Rule => Rule.required().min(0)
                                    })
                                  ],
                                  preview: {
                                    select: {
                                      title: 'name',
                                      subtitle: 'descriptionRef.description'
                                    }
                                  }
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
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'models.0.name'
    }
  }
});