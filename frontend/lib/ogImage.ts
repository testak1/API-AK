type VehicleOgImageParams = {
  brand: string;
  model?: string;
  stage?: string;
  originalHk?: number | null;
  tunedHk?: number | null;
  originalNm?: number | null;
  tunedNm?: number | null;
};

export function buildVehicleOgImageUrl(params: VehicleOgImageParams) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  return `https://tuning.aktuning.se/api/og/vehicle?${query.toString()}`;
}
