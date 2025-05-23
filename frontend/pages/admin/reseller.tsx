import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function ResellerAdmin() {
  const sessionData = useSession();
  console.log("SESSION DEBUG:", sessionData);
  const session = sessionData?.data;
  const status = sessionData?.status;
  console.log("Session status:", status);
  const [brands, setBrands] = useState([]);
  const [overrides, setOverrides] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/brands-with-overrides");
      const { brands, overrides } = await res.json();
      setBrands(brands);
      setOverrides(overrides);
    };
    fetchData();
  }, []);

  const findOverride = (brand, model, year, engine, stageName) => {
    return overrides.find(
      (o) =>
        o.brand === brand &&
        o.model === model &&
        o.year === year &&
        o.engine === engine &&
        o.stageName === stageName,
    );
  };

  const handleSave = async (
    overrideId,
    brand,
    model,
    year,
    engine,
    stageName,
    price,
    hk,
    nm,
  ) => {
    await fetch("/api/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overrideId,
        brand,
        model,
        year,
        engine,
        stageName,
        price,
        tunedHk: hk,
        tunedNm: nm,
      }),
    });
    alert("Saved");
  };

  if (status === "loading") return <p>Loading...</p>;
  if (status === "unauthenticated") return <p>Access Denied</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Reseller Admin</h1>
      <button onClick={() => signOut()}>Sign out</button>
      {brands.map((brand) =>
        brand.models.map((model) =>
          model.years.map((year) =>
            year.engines.map((engine) =>
              engine.stages.map((stage) => {
                const override = findOverride(
                  brand.name,
                  model.name,
                  year.range,
                  engine.label,
                  stage.name,
                );
                return (
                  <div
                    key={`${brand.name}-${model.name}-${year.range}-${engine.label}-${stage.name}`}
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      margin: "10px 0",
                    }}
                  >
                    <p>
                      <b>
                        {brand.name} / {model.name} / {year.range} /{" "}
                        {engine.label} / {stage.name}
                      </b>
                    </p>
                    <p>
                      Base: {stage.price} kr | {stage.tunedHk} HK |{" "}
                      {stage.tunedNm} NM
                    </p>
                    <input
                      placeholder="Price"
                      defaultValue={override?.price ?? stage.price}
                      id={`price-${stage.name}`}
                    />
                    <input
                      placeholder="HK"
                      defaultValue={override?.tunedHk ?? stage.tunedHk}
                      id={`hk-${stage.name}`}
                    />
                    <input
                      placeholder="NM"
                      defaultValue={override?.tunedNm ?? stage.tunedNm}
                      id={`nm-${stage.name}`}
                    />
                    <button
                      onClick={() =>
                        handleSave(
                          override?._id || null,
                          brand.name,
                          model.name,
                          year.range,
                          engine.label,
                          stage.name,
                          +(
                            document.getElementById(
                              `price-${stage.name}`,
                            ) as HTMLInputElement
                          ).value,
                          +(
                            document.getElementById(
                              `hk-${stage.name}`,
                            ) as HTMLInputElement
                          ).value,
                          +(
                            document.getElementById(
                              `nm-${stage.name}`,
                            ) as HTMLInputElement
                          ).value,
                        )
                      }
                    >
                      Save
                    </button>
                  </div>
                );
              }),
            ),
          ),
        ),
      )}
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
