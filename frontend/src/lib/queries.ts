// src/lib/queries.ts
// Lightweight query (for /api/brands.ts)

import groq from "groq";

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
  *[_type == "brand" && slug.current == $brand][0]{
    name,
    "logo": logo{
      alt,
      "asset": asset->{
        _id,
        url
      }
    },
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
              description
            },
            tcuFields {
              launchControl { original, optimized },
              rpmLimit { original, optimized },
              shiftTime { original, optimized }
            }
          }
        }
      }
    }
  }
`;

export const resellerOverrideQuery = groq`
  *[_type == "resellerOverride" && resellerId == $resellerId &&
     brand == $brand && model == $model && year == $year && engine == $engine][0] {
    logo,
    aktplusVisible,
    stages[]{
      name,
      price,
      tunedHk,
      tunedNm
    }
  }
`;

export const stationPageQuery = groq`
*[_type == "station" && slug.current == $station][0]{
  _id,
  city,
  phone,
  email,
  "slug": slug.current,
  address,
  location,
  instagramUrl,
  openingHours[],
  services[]{
    title,
    description
  },
  testimonials[]{
    name,
    vehicle,
    quote
  },
  gallery[],
  featuredImage,
  content,
  elfsightWidgetId,
  "brands": *[_type == "brand"]{
    _id,
    name,
    logo {
      asset->{
        _id,
        url
      },
      alt
    }
  
  
}`;

export const resellerOverridesForEngineQuery = groq`
  *[_type == "resellerOverride" &&
    resellerId == $resellerId &&
    engine._ref == $engineId] {
      _id,
      stageName,
      price,
      tunedHk,
      tunedNm,
      customDescription,
      showAktPlus,
      logo
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
