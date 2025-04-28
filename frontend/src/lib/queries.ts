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

// Heavy query (when you need full info like stages, aktplus, engines)
export const allBrandsQuery = `
*[_type == "brand"]{
  _id,
  _type,
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
    name,
    "years": years[]{
      range,
      "engines": engines[]{
        _key,
        _id,
        label,
        fuel,
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
        },
        "stages": stages[]{
          name,
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
          }
        }
      }
    }
  }
}
`;



// NEW: Admin-specific query (keeps your existing structure but adds _key fields)
export const adminBrandsQuery = `
*[_type == "brand"]{
  _id,
  name,
  "models": models[]{
    name,
    _key,
    "years": years[]{
      range,
      _key,
      "engines": engines[]{
        _key,
        label,
        fuel,
        "stages": stages[]{
          _key,
          name,
          price,
          description,
          descriptionRef->{ _id },
          origHk,
          tunedHk,
          origNm,
          tunedNm
        }
      }
    }
  }
}
`;

// NEW: Query for stage management dropdowns
export const stageManagementQueries = {
  getStageNames: `*[_type == "brand"]{
    "stages": models[].years[].engines[].stages[].name
  }.stages`,
  
  getDescriptions: `*[_type == "stageDescription"]{
    _id,
    title,
    stageName,
    description
  }`,
  
  getEnginePaths: `*[_type == "brand"]{
    _id,
    name,
    "models": models[]{
      name,
      _key,
      "years": years[]{
        range,
        _key,
        "engines": engines[]{
          _key,
          label
        }
      }
    }
  }`
};

// NEW: Helper queries for bulk operations (won't conflict with existing)
export const bulkOperationQueries = {
  getStageByPath: `*[_type == "brand" && _id == $brandId] {
    "model": models[_key == $modelKey] {
      "year": years[_key == $yearKey] {
        "engine": engines[_key == $engineKey] {
          "stage": stages[_key == $stageKey] {
            ...,
            descriptionRef->{ _id }
          }
        }
      }
    }
  }`,
  
  getEnginesByPath: `*[_type == "brand" && _id == $brandId] {
    "model": models[_key == $modelKey] {
      "year": years[_key == $yearKey] {
        "engine": engines[_key == $engineKey] {
          _key,
          "stages": stages[]{
            _key,
            name
          }
        }
      }
    }
  }`
};
