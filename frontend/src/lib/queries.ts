// Lightweight query (for /api/brands.ts)
export const brandsLightQuery = `
*[_type == "brand"]{
  _id,
  name,
  "slug": slug.current,
  logo {
    "asset": asset->{
      _id,
      url
    },
    alt
  },
  "models": models[]{
    name
  }
}
`;

export const engineByParamsQuery = `
*[_type == "brand" && name == $brand][0]{
  models[name == $model][0]{
    years[range == $year][0]{
      engines[]{
        _id,
        _key,
        label,
        fuel,
        "slug": label,
        stages[]{
          name,
          "slug": name,
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
          // Dynamic scoped aktPlusOptions
          "aktPlusOptions": *[_type == "aktPlus" &&
            (
              isUniversal == true ||
              ^.^.fuel in applicableFuelTypes
            ) &&
            (
              !defined(stageCompatibility) ||
              stageCompatibility == ^.name
            )
          ]{
            _id,
            title,
            price,
            isUniversal,
            applicableFuelTypes,
            stageCompatibility,
            compatibilityNotes,
            description,
            gallery[]{
              _key,
              alt,
              caption,
              "asset": asset->{
                _id,
                url
              }
            }
          }
        },
        // Dynamic global aktPlusOptions
        "globalAktPlusOptions": *[_type == "aktPlus" &&
          (
            isUniversal == true ||
            ^.fuel in applicableFuelTypes
          ) &&
          !defined(stageCompatibility)
        ]{
          _id,
          title,
          price,
          isUniversal,
          applicableFuelTypes,
          stageCompatibility,
          compatibilityNotes,
          description,
          gallery[]{
            _key,
            alt,
            caption,
            "asset": asset->{
              _id,
              url
            }
          }
        }
      }
    }
  }
}.models.years.engines
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
