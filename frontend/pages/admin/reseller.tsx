import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function ResellerAdmin() {
  const { data: session, status } = useSession();
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

  const overrideMap = new Map(overrides.map(o => [o.stage._ref, o]));

  const handleSave = async (stageId, overrideId, price, hk, nm) => {
    await fetch("/api/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, overrideId, price, tunedHk: hk, tunedNm: nm }),
    });
    alert("Saved");
  };

  if (status === "loading") return <p>Loading...</p>;
  if (!session) return <p>Access Denied</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Reseller Admin</h1>
      <button onClick={() => signOut()}>Sign out</button>
      {brands.map(brand =>
        brand.models.map(model =>
          model.years.map(year =>
            year.engines.map(engine =>
              engine.stages.map(stage => {
                const override = overrideMap.get(stage._id);
                return (
                  <div key={stage._id} style={{ border: "1px solid #ccc", padding: "10px", margin: "10px 0" }}>
                    <p><b>{brand.name} / {model.name} / {year.range} / {engine.label} / {stage.name}</b></p>
                    <p>Base: {stage.price} kr | {stage.tunedHk} HK | {stage.tunedNm} NM</p>
                    <input placeholder="Price" defaultValue={override?.price ?? stage.price} id={`price-${stage._id}`} />
                    <input placeholder="HK" defaultValue={override?.tunedHk ?? stage.tunedHk} id={`hk-${stage._id}`} />
                    <input placeholder="NM" defaultValue={override?.tunedNm ?? stage.tunedNm} id={`nm-${stage._id}`} />
                    <button onClick={() => handleSave(
                      stage._id,
                      override?._id || null,
                      +document.getElementById(`price-${stage._id}`).value,
                      +document.getElementById(`hk-${stage._id}`).value,
                      +document.getElementById(`nm-${stage._id}`).value
                    )}>
                      Save
                    </button>
                  </div>
                );
              })
            )
          )
        )
      )}
    </div>
  );
}