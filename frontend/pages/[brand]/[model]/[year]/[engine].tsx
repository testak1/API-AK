// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { brand, model, year, engine } = context.params as {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };

  try {
    const result = await client.fetch(engineByParamsQuery, {
      brand,
      model,
      year,
      engine,
    });

    return {
      props: {
        brandData: result.brandData,
        modelData: result.modelData,
        yearData: result.yearData,
        engineData: result.engineData,
      },
    };
  } catch (err) {
    console.error("Engine fetch failed:", err);
    return { notFound: true };
  }
};

export default function EnginePage({ brandData, modelData, yearData, engineData }: any) {
  const router = useRouter();

  if (!engineData) {
    return <p>Motorinformation saknas.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {router.query.brand} / {router.query.model} / {router.query.year} / {router.query.engine}
      </h1>
      <p className="text-lg font-medium mb-2">Modell: {modelData?.name}</p>
      <p className="text-lg mb-2">År: {yearData?.range}</p>
      <p className="text-lg mb-4">Motor: {engineData?.label}</p>

      <div>
        {engineData?.stages?.map((stage: any) => (
          <div key={stage.name} className="mb-6 border p-4 rounded">
            <h2 className="text-xl font-semibold">{stage.name}</h2>
            <p>Original HK: {stage.origHk} → Tuned: {stage.tunedHk}</p>
            <p>Original Nm: {stage.origNm} → Tuned: {stage.tunedNm}</p>
          </div>
        ))}
      </div>
    </div>
  );
}