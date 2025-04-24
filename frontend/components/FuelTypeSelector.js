// components/FuelTypeSelector.tsx
import React, { useEffect, useState } from 'react';
import { Box, Stack, Label, Checkbox, Text } from '@sanity/ui';
import { PatchEvent, set, unset } from 'sanity';

interface FuelTypeSelectorProps {
  value: string[];
  onChange: (event: PatchEvent) => void;
  document: {
    isUniversal?: boolean;
  };
}

const fuelOptions = [
  { id: 'diesel', title: 'Diesel' },
  { id: 'bensin', title: 'Bensin' },
  { id: 'hybrid', title: 'Hybrid' },
  { id: 'electric', title: 'Electric' }
];

export default function FuelTypeSelector(props: FuelTypeSelectorProps) {
  const { value = [], onChange, document } = props;
  const [selectedFuels, setSelectedFuels] = useState<string[]>(value);

  useEffect(() => {
    if (document?.isUniversal) {
      setSelectedFuels([]);
      onChange(unset());
    }
  }, [document?.isUniversal, onChange]);

  const handleChange = (fuelType: string) => {
    const updated = selectedFuels.includes(fuelType)
      ? selectedFuels.filter(f => f !== fuelType)
      : [...selectedFuels, fuelType];

    setSelectedFuels(updated);
    onChange(updated.length > 0 ? set(updated) : unset());
  };

  return (
    <Stack space={3}>
      <Label>Compatible Fuel Types</Label>
      {document?.isUniversal ? (
        <Text size={1} muted>Universal option – applies to all fuel types</Text>
      ) : (
        <Box>
          {fuelOptions.map(option => (
            <div key={option.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5em' }}>
              <Checkbox
                checked={selectedFuels.includes(option.id)}
                onChange={() => handleChange(option.id)}
              />
              <Text size={1} style={{ marginLeft: '0.5em' }}>{option.title}</Text>
            </div>
          ))}
        </Box>
      )}
    </Stack>
  );
}
