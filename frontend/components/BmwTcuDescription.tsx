const benefits = [
  "Optimerad respons och förbättrad körbarhet.",
  "Snabbare och mjukare växlingar.",
  "Anpassade körprogram i Comfort, Sport och Sport+.",
  "Justerade vridmomentsbegränsningar.",
  "Optimerade växlingspunkter för bättre acceleration och prestanda.",
  "Förbättrad launch control och möjlighet till individuella inställningar.",
  "Minskad fördröjning vid växling med paddlar.",
  "Förbättrat värmeskydd för ökad hållbarhet i växellådan.",
  "Högre kopplingstryck för bättre grepp vid höga effektuttag.",
  "Höjd varvtalsgräns (RPM Limit) vid behov m.m.",
];

const options = [
  "Bortprogrammering av Kickdown.",
  "Bortprogrammering av automatisk uppväxling i manuellt läge.",
  "Individuellt anpassade växlingspunkter.",
  "Individuellt inställd launch control.",
  "Höjd launch control-begränsning.",
];

export const isBmwBrand = (brand?: string): boolean =>
  (brand || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") === "bmw";

export default function BmwTcuDescription() {
  return (
    <div className="space-y-4">
      <p>
        Våra mjukvaror för BMW automat- och DCT-växellådor utförs enbart i
        samband med motoroptimering hos oss.
      </p>
      <p>
        På bilar utrustade med ZF8HP, DKG/DCT eller Steptronic växellåda
        rekommenderar vi att optimera/uppdatera växellådans mjukvara för att
        anpassa den till den ökade effekten och det högre vridmomentet. Detta
        förbättrar både driftsäkerhet, körbarhet och prestanda!
      </p>

      <div>
        <p className="font-semibold text-white">
          Några av fördelarna med vår växellådsmjukvara för BMW:
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
