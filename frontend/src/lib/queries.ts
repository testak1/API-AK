// frontend/src/lib/queries.ts
export const allBrandsQuery = `*[_type == "brand"]{
  _id,
  name,
  "slug": slug.current,
  "models": models[]{
    name,
    "years": years[]{
      range,
      "engines": engines[]{
        _id,
        fuel,
        label,
        "globalAktPlusOptions": *[_type == "aktPlus" && (
          isUniversal == true || 
          ^.fuel in applicableFuelTypes
        ) && !defined(stageCompatibility)]{
          _id,
          title,
          price
        },
        "stages": stages[]{
          name,
          origHk,
          tunedHk,
          origNm,
          tunedNm,
          price,
          "aktPlusOptions": *[_type == "aktPlus" && (
            isUniversal == true || 
            ^.^.fuel in applicableFuelTypes
          ) && (
            !defined(stageCompatibility) || 
            stageCompatibility == ^.name
          )]{
            _id,
            title,
            price
          }
        }
      }
    }
  }
}`;
