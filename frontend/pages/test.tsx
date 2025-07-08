import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Brand = {
  name: string;
  slug: string;
  image: string;
};

type Model = {
  name: string;
  image: string;
};

const brands: Brand[] = [
  { name: 'Audi', slug: 'audi', image: '/brands/audi.png' },
  { name: 'BMW', slug: 'bmw', image: '/brands/bmw.png' },
  { name: 'Volkswagen', slug: 'volkswagen', image: '/brands/volkswagen.png' },
  // Lägg till fler märken här
];

const modelsPerBrand: { [key: string]: Model[] } = {
  audi: [
    { name: 'A3', image: '/models/audi_a3.png' },
    { name: 'A4', image: '/models/audi_a4.png' },
    { name: 'Q5', image: '/models/audi_q5.png' },
  ],
  bmw: [
    { name: '3 Series', image: '/models/bmw_3.png' },
    { name: '5 Series', image: '/models/bmw_5.png' },
  ],
  volkswagen: [
    { name: 'Golf', image: '/models/vw_golf.png' },
    { name: 'Passat', image: '/models/vw_passat.png' },
  ],
};

export default function TestPage() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const models = selectedBrand ? modelsPerBrand[selectedBrand] || [] : [];

  return (
    <div style={{ padding: 30 }}>
      {!selectedBrand ? (
        <>
          <h2 style={{ marginBottom: 20 }}>Välj bilmärke</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 25 }}>
            {brands.map((brand) => (
              <div
                key={brand.slug}
                onClick={() => setSelectedBrand(brand.slug)}
                style={{ cursor: 'pointer', textAlign: 'center' }}
              >
                <Image
                  src={brand.image}
                  alt={brand.name}
                  width={100}
                  height={100}
                />
                <p>{brand.name}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setSelectedBrand(null)} style={{ marginBottom: 20 }}>
            ← Tillbaka
          </button>
          <h2 style={{ marginBottom: 20 }}>Modeller för {selectedBrand.toUpperCase()}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 25 }}>
            {models.map((model) => (
              <div
                key={model.name}
                style={{ textAlign: 'center', cursor: 'pointer' }}
              >
                <Image
                  src={model.image}
                  alt={model.name}
                  width={120}
                  height={70}
                />
                <p>{model.name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
