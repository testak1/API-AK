const benefits = [
  "Optimerad respons och förbättrad körbarhet.",
  "Snabbare och mjukare växlingar.",
  "Anpassade körlägen i Comfort, Sport och Sport+.",
  "Justerade vridmomentsbegränsningar.",
  "Optimerade växlingspunkter för bättre acceleration och prestanda.",
  "Förbättrad launch control samt möjlighet till individuella inställningar.",
  "Minskad fördröjning vid växling med paddlar.",
  "Förbättrat värmeskydd för ökad hållbarhet i växellådan.",
  "Justerat kopplingstryck för bättre grepp vid högre effektuttag.",
  "Höjd varvtalsgräns (RPM Limit) vid behov m.m.",
];

const options = [
  "Bortprogrammering av Kickdown.",
  "Bortprogrammering av automatisk uppväxling i manuellt läge.",
  "Individuellt anpassade växlingspunkter.",
  "Individuellt inställd launch control.",
  "Höjd launch control-begränsning.",
];

export const MERCEDES_TCU_DESCRIPTION_TEXT = [
  "Våra mjukvaror för Mercedes automat- och AMG-växellådor utförs enbart i samband med motoroptimering hos oss.",
  "På bilar utrustade med 7G-Tronic, 9G-Tronic eller AMG Speedshift växellåda rekommenderar vi att optimera/uppdatera växellådans mjukvara för att anpassa den till den ökade effekten och det högre vridmomentet. Detta förbättrar både driftsäkerhet, körkänsla och prestanda!",
  "Några av fördelarna med vår växellådsmjukvara för Mercedes:",
  ...benefits,
  "Tillval:",
  ...options,
].join(" ");

export const isMercedesBrand = (brand?: string): boolean => {
  const key = (brand || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return ["mercedes", "mercedesbenz", "mercedesamg"].includes(key);
};

export default function MercedesTcuDescription() {
  return (
    <div className="space-y-4">
      <p>
        Våra mjukvaror för Mercedes automat- och AMG-växellådor utförs enbart i
        samband med motoroptimering hos oss.
      </p>
      <p>
        På bilar utrustade med 7G-Tronic, 9G-Tronic eller AMG Speedshift
        växellåda rekommenderar vi att optimera/uppdatera växellådans mjukvara
        för att anpassa den till den ökade effekten och det högre vridmomentet.
        Detta förbättrar både driftsäkerhet, körkänsla och prestanda!
      </p>

      <div>
        <p className="font-semibold text-white">
          Några av fördelarna med vår växellådsmjukvara för Mercedes:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {benefits.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="font-semibold text-white">Tillval:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {options.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
