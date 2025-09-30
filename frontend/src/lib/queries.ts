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

export const brandBySlugQuery = `
  *[_type == "brand" && (slug.current == $brand || lower(name) == $brand)][0]{
    _id,
    name,
    slug,
    logo {
      alt,
      "asset": asset->{
        _id,
        url
      }
    },
    models[]{
      _id,
      name,
      slug,
      years[]{
        _id,
        range,
        slug,
        engines[]{
          _id,
          label,
          slug,
          fuel
        }
      }
    }
  }
`;

// Hämta enbart model med years
export const modelBySlugQuery = groq`
  *[_type == "brand" && (slug.current == $brand || lower(name) == $brand)][0]{
    name,
    "slug": slug.current,
    models[]{
      _id,
      name,
      "slug": slug.current,
      years[]{
        _id,
        range,
        "slug": slug.current
      }
    }
  }
`;

// Hämta enbart year med engines
export const yearBySlugQuery = groq`
  *[_type == "brand" && (slug.current == $brand || lower(name) == $brand)][0]{
    name,
    "slug": slug.current,
    models[]{
      name,
      "slug": slug.current,
      years[]{
        _id,
        range,
        "slug": slug.current,
        engines[]{
          _id,
          label,
          "slug": slug.current
        }
      }
    }
  }
`;

export const specificEngineQuery = groq`
*[_type == "brand" && slug.current == $brand][0]{
    _id,
    name,
    slug,
    "logo": logo{ alt, "asset": asset->{_id, url} },
    "model": models[slug.current == $model || name == $model][0]{
        _id,
        name,
        slug,
        "year": years[slug == $year || range == $year][0]{
            _id,
            range,
            slug,
            "engine": engines[slug == $engine || label == $engine][0]{
                _id,
                label,
                fuel,
                slug,
                stages[]{
                    name,
                    type,
                    origHk,
                    tunedHk,
                    origNm,
                    tunedNm,
                    price,
                    "description": description[$lang],
                    "descriptionRef": descriptionRef->{
                        "description": description[$lang]
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
            "description": description[$lang],
            "descriptionRef": descriptionRef->{
              "description": description[$lang]
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
  google,
  instagram,
  facebook,
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
  },
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
