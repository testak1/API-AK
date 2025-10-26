import {NextApiRequest, NextApiResponse} from "next";
// Importera din Sanity-klient som har skrivbehörighet (token i .env)
import {sanityClient} from "@/lib/sanity.server";

// Hårt kodat pris: 7995 SEK
const NEW_PRICE = 7995;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Av säkerhetsskäl, tillåt endast POST och lägg till någon form av enkel autentisering
  // (t.ex. en hemlig nyckel i body/query) om du skulle lämna denna fil uppe.
  if (req.method !== "POST") {
    return res.status(405).json({message: "Endast POST tillåten"});
  }

  // Enkel "säkerhetskontroll" - byt ut "YOUR_SECRET_KEY"
  if (req.query.key !== "MY_TEMP_ADMIN_KEY_1234") {
    return res.status(401).json({message: "Obehörig"});
  }

  try {
    // 1. Hämta ID:n för alla jetSki-dokument
    const jetSkisToUpdate = await sanityClient.fetch(
      `*[_type == "jetSki"]._id`
    );

    if (jetSkisToUpdate.length === 0) {
      return res
        .status(200)
        .json({message: "Inga jetSkis hittades att uppdatera."});
    }

    // 2. Skapa en transaktion
    let transaction = sanityClient.transaction();

    // 3. Lägg till en patch för varje dokument i transaktionen
    jetSkisToUpdate.forEach((id: string) => {
      transaction = transaction.patch(
        id,
        p => p.set({price: NEW_PRICE}) // Sätter priset till 7995 på fältet 'price'
      );
    });

    // 4. Utför transaktionen
    const result = await transaction.commit();

    // Logga resultatet (valfritt)
    console.log(`Successfully updated ${jetSkisToUpdate.length} jetSkis.`);

    res.status(200).json({
      message: `Uppdaterade ${jetSkisToUpdate.length} jetSkis. Nytt pris: ${NEW_PRICE} SEK.`,
      result,
    });
  } catch (err: any) {
    console.error("🔥 Fel vid prisuppdatering:", err);
    res.status(500).json({
      message: "Ett fel uppstod vid uppdatering av priser.",
      error: err.message,
    });
  }
}
