// components/FuelTypeSelector.js
import React from 'react';
import {useState, useEffect} from 'react';
import {Box, Stack, Label, Checkbox, Text} from '@sanity/ui';

export default function FuelTypeSelector(props) {
  const [selectedFuels, setSelectedFuels] = useState(props.value || []);
  
  const fuelOptions = [
    {id: 'diesel', title: 'Diesel'},
    {id: 'bensin', title: 'Bensin'},
    {id: 'hybrid', title: 'Hybrid'},
    {id: 'electric', title: 'Electric'}
  ];

  useEffect(() => {
    if (props.document?.isUniversal) {
      setSelectedFuels([]);
      props.onChange([]);
    }
  }, [props.document?.isUniversal]);

  const handleChange = (fuelType) => {
    const newSelection = selectedFuels.includes(fuelType)
      ? selectedFuels.filter(f => f !== fuelType)
      : [...selectedFuels, fuelType];
    setSelectedFuels(newSelection);
    props.onChange(newSelection);
  };

  return (
    <Stack space={3}>
      <Label>Compatible Fuel Types</Label>
      {props.document?.isUniversal ? (
        <Text size={1} muted>Universal option - applies to all fuel types</Text>
      ) : (
        <Box>
          {fuelOptions.map(option => (
            <div key={option.id} style={{display: 'flex', alignItems: 'center', marginBottom: '0.5em'}}>
              <Checkbox
                checked={selectedFuels.includes(option.id)}
                onChange={() => handleChange(option.id)}
                disabled={props.document?.isUniversal}
                style={{marginRight: '0.5em'}}
              />
              <Text size={1}>{option.title}</Text>
            </div>
          ))}
        </Box>
      )}
    </Stack>
  );
}