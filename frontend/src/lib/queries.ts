// Lightweight query (for /api/brands.ts)
export const brandsLightQuery = `
*[_type == "brand"]{
  _id,
  name,
  "slug": slug.current,
  "slugSafe": lower(replace(replace(name, "[^a-zA-Z0-9\\s-]", ""), "\\s+", "-")),
  logo {
    "asset": asset->{
      _id,
      url
    },
    alt
  },
  "models": models[]{
    name,
    "slug": lower(replace(replace(name, "[^a-zA-Z0-9\\s-]", ""), "\\s+", "-")),
    "years": years[]{
      range,
      "slug": lower(replace(replace(range, "[^a-zA-Z0-9\\s-]", ""), "\\s+", "-"))
    }
  }
}
`;


export const engineByParamsQuery = `
  query EngineByParams($brand: String!, $model: String!, $year: String!, $engine: String!) {
    "brandData": *[_type == "brand" && slug.current == $brand][0]{
      name,
      "models": models[]{
        name,
        "years": years[]{
          range,
          "engines": engines[]{
            label,
            fuel,
            "stages": stages[]{
              name,
              origHk,
              tunedHk,
              origNm,
              tunedNm,
              price,
              description,
              descriptionRef->{
                description
              }
            }
          }
        }
      }
    }
  } | {
    "brandData": brandData,
    "modelData": brandData.models[name match $model][0],
    "yearData": brandData.models[name match $model][0].years[range match $year][0],
    "engineData": brandData.models[name match $model][0].years[range match $year][0].engines[label match $engine][0]
  }
`;


// Heavy query (when you need full info like stages, aktplus, engines)
export const allBrandsQuery = `
*[_type == "brand"]{
  _id,
  name,
  slug,
"slugCurrent": slug.current,
  "models": models[]{
    name,
    "years": years[]{
      range,
      "engines": engines[]{
        _id,
        label,
        fuel,
        "stages": stages[]{
          name,
          type,
          origHk,
          tunedHk,
          origNm,
          tunedNm,
          price,
          description,
          descriptionRef->{
            _id,
            stageName,
            description
          },
          "aktPlusOptions": *[_type == "aktPlus" && (
            isUniversal == true || 
            ^.^.fuel in applicableFuelTypes
          ) && (
            !defined(stageCompatibility) || 
            stageCompatibility == ^.name
          )]{
            _id,
            title,
            price,
            isUniversal,
            applicableFuelTypes,
            stageCompatibility,
            description,
            "gallery": gallery[]{
              _key,
              alt,
              caption,
              "asset": asset->{
                _id,
                url
              }
            },
            installationTime,
            compatibilityNotes
          },
          tcuFields {
            launchControl { original, optimized },
            rpmLimit { original, optimized },
            shiftTime { original, optimized }
          }
        },
        "globalAktPlusOptions": *[_type == "aktPlus" && (
          isUniversal == true || 
          ^.fuel in applicableFuelTypes
        ) && !defined(stageCompatibility)]{
          _id,
          title,
          price,
          isUniversal,
          applicableFuelTypes,
          stageCompatibility,
          description,
          "gallery": gallery[]{
            _key,
            alt,
            caption,
            "asset": asset->{
              _id,
              url
            }
          },
          installationTime,
          compatibilityNotes
        }
      }
    }
  }
}
`;
