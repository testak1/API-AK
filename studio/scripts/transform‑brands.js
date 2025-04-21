// studio/scripts/transform‑brands.js
const fs = require('fs')
const path = require('path')

// 1) load your big JSON
const data = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../all_tuning_data.json'), 'utf8')
)

// 2) map each top‑level key into a Sanity doc
//    You may tweak the model/year/engine shape to match exactly your schema
Object.entries(data).forEach(([brandName, models]) => {
  const doc = {
    _type: 'brand',
    _id:   brandName.toLowerCase().replace(/\s+/g, '-'),
    name:  brandName,
    models: Object.entries(models).map(([modelName, years]) => ({
      name: modelName,
      years: Object.entries(years).map(([range, fuelGroups]) => ({
        range,
        engines: Object.entries(fuelGroups)
          .flatMap(([fuel, engines]) =>
            Object.entries(engines).map(([label, stages]) => ({
              fuel,
              label,
              stages: Object.entries(stages).map(([stageName, stats]) => ({
                name:    stageName,
                origHk:  stats['Original hk'],
                tunedHk: stats['Optimerad hk'],
                origNm:  stats['Original Nm'],
                tunedNm: stats['Optimerad Nm'],
                price:   stats['Pris']
              }))
            }))
          )
      }))
    }))
  }

  // 3) print one JSON doc per line
  console.log(JSON.stringify(doc))
})
