// studio/scripts/make-ndjson.js
import fs       from 'fs'
import path     from 'path'
import { fileURLToPath } from 'url'
import slugify  from 'slugify'

// fix __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// load your full scrape
const allData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../all_tuning_data.json'), 'utf-8')
)

const outPath = path.resolve(__dirname, '../brands.ndjson')
const out = fs.createWriteStream(outPath)

for (const [brandName, models] of Object.entries(allData)) {
  const doc = {
    _type: 'brand',
    _id:   slugify(brandName, {lower:true, strict:true}),
    name:  brandName,
    models: Object.entries(models).map(([modelName, years]) => ({
      name: modelName,
      years: Object.entries(years).map(([range, fuels]) => ({
        range,
        engines: ['Bensin','Diesel','Hybrid']
          .flatMap(fuelType =>
            Object.entries(fuels[fuelType] || {}).map(([label, stages]) => ({
              fuel:  fuelType,
              label,
              stages: Object.entries(stages).map(([stageName, vals]) => ({
                name:    stageName,
                origHk:  vals['Original hk']  || 0,
                tunedHk: vals['Optimerad hk'] || 0,
                origNm:  vals['Original Nm']  || 0,
                tunedNm: vals['Optimerad Nm'] || 0,
                price:   vals['Pris']         || 0
              }))
            }))
          )
      }))
    }))
  }
  out.write(JSON.stringify(doc) + '\n')
}

out.end(() => console.log(`✅ Written ${outPath}`))
