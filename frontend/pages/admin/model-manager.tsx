import { useState } from "react";
import ChevronDownIcon from "../../components/ChevronDownIcon";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";
import fs from "fs";
import path from "path";

interface Model {
  name: string;
  id: string;
  image_url: string;
  brand: string;
}

interface Props {
  models: Model[];
}

export default function ModelManager({ models: initialModels }: Props) {
  const [models, setModels] = useState<Model[]>(initialModels);
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>(
    {},
  );
  const [newModel, setNewModel] = useState<{
    brand: string;
    name: string;
    id: string;
    file: File | null;
  }>({ brand: "", name: "", id: "", file: null });
  const [uploading, setUploading] = useState(false);

  const modelsByBrand = models.reduce<Record<string, Model[]>>((acc, m) => {
    if (!acc[m.brand]) acc[m.brand] = [];
    acc[m.brand].push(m);
    return acc;
  }, {});

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/models", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setModels(models.filter((m) => m.id !== id));
  };

  const uploadImage = (file: File, brand: string, name: string) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(",")[1];
          const res = await fetch("/api/upload-model-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageData: base64,
              filename: `${brand}-${name}.png`,
            }),
          });
          const data = await res.json();
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject("File reading failed");
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpdate = async (model: Model, file: File) => {
    setUploading(true);
    const url = await uploadImage(file, model.brand, model.name);
    await fetch("/api/models", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: model.id, image_url: url }),
    });
    setModels(
      models.map((m) => (m.id === model.id ? { ...m, image_url: url } : m)),
    );
    setUploading(false);
  };

  const handleAddModel = async () => {
    if (!newModel.file) return;
    setUploading(true);
    const url = await uploadImage(newModel.file, newModel.brand, newModel.name);
    await fetch("/api/add-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newModel.name,
        id: newModel.id,
        brand: newModel.brand,
        image_url: url,
      }),
    });
    setModels([
      ...models,
      {
        name: newModel.name,
        id: newModel.id,
        brand: newModel.brand,
        image_url: url,
      },
    ]);
    setNewModel({ brand: "", name: "", id: "", file: null });
    setUploading(false);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Model Manager</h1>
      <div className="space-y-4">
        {Object.entries(modelsByBrand).map(([brand, brandModels]) => (
          <div key={brand} className="border rounded">
            <button
              onClick={() => toggleBrand(brand)}
              className="w-full flex justify-between items-center p-3 bg-gray-100"
            >
              <span className="font-semibold">{brand}</span>
              <ChevronDownIcon
                className={`w-5 h-5 transform transition-transform ${expandedBrands[brand] ? "rotate-180" : ""}`}
              />
            </button>
            {expandedBrands[brand] && (
              <ul className="space-y-4 p-3">
                {brandModels.map((m) => (
                  <li key={m.id} className="border p-3 rounded">
                    <div className="flex items-center space-x-4">
                      <img
                        src={m.image_url}
                        alt={m.name}
                        className="w-24 h-10 object-contain"
                      />
                      <span className="flex-1">
                        {m.name} ({m.id})
                      </span>
                      <input
                        type="file"
                        accept=".png"
                        onChange={(e) =>
                          e.target.files?.[0] &&
                          handleImageUpdate(m, e.target.files[0])
                        }
                      />
                      <button
                        className="text-red-600"
                        onClick={() => handleDelete(m.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-2">Add New Model</h2>
      <div className="space-y-2">
        <input
          className="border p-1 w-full"
          placeholder="Brand"
          value={newModel.brand}
          onChange={(e) => setNewModel({ ...newModel, brand: e.target.value })}
        />
        <input
          className="border p-1 w-full"
          placeholder="Model Name"
          value={newModel.name}
          onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
        />
        <input
          className="border p-1 w-full"
          placeholder="Model ID"
          value={newModel.id}
          onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
        />
        <input
          type="file"
          accept=".png"
          onChange={(e) =>
            setNewModel({ ...newModel, file: e.target.files?.[0] || null })
          }
        />
        <button
          className="bg-blue-600 text-white px-3 py-1"
          disabled={uploading}
          onClick={handleAddModel}
        >
          Add Model
        </button>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (
  context,
) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false,
      },
    };
  }

  const file = fs.readFileSync(
    path.join(process.cwd(), "public", "data", "all_models.json"),
    "utf8",
  );
  const models = JSON.parse(file);

  return { props: { models } };
};
