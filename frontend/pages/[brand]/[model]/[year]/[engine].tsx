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

    // Process the data on the server side
    const modelData = result?.models?.find(
      (m: any) => m.name.toLowerCase() === model.toLowerCase()
    );

    const yearData = modelData?.years?.find(
      (y: any) => y.range.toLowerCase() === year.toLowerCase()
    );

    const engineData = yearData?.engines?.find(
      (e: any) => e.label.toLowerCase() === engine.toLowerCase()
    );

    if (!engineData) {
      return { notFound: true };
    }

    return {
      props: {
        brandData: result,
        modelData,
        yearData,
        engineData,
      },
    };
  } catch (err) {
    console.error("Engine fetch failed:", err);
    return { notFound: true };
  }
};
