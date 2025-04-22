// frontend/src/App.tsx
import React, { useEffect, useState } from 'react'
import { sanityClient } from '/lib/sanityClient'

function App() {
  const [brands, setBrands] = useState<Brand[]>([])

  useEffect(() => {
    sanityClient.fetch(QUERY).then(setBrands)
  }, [])

  // …render exactly as above…
}
