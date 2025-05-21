// pages/dashboard.tsx
import React from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Återförsäljare Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Här kommer du kunna ändra pris, logotyp, AKT+ osv.
      </p>
    </div>
  );
}
