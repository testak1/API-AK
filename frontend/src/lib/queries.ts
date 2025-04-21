// frontend/src/lib/queries.ts
export const allBrandsQuery = `*[_type == "brand"]{
  name,
  "models": models[]{
    name,
    years[]{ 
      range,
      engines[]{
        fuel,
        label,
        stages[]{
          name,
          origHk,
          tunedHk,
          origNm,
          tunedNm,
          price
        }
      }
    }
  }
}`
