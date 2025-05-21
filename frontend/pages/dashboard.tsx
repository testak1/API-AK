// pages/dashboard.tsx
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Dashboard() {
  return (
    <>
      <SignedOut>
        <SignInButton />
      </SignedOut>

      <SignedIn>
        <h1>Välkommen till din återförsäljarpanel</h1>
        {/* Komponent för att ändra overrides kommer här */}
      </SignedIn>
    </>
  );
}
