
import { getStore } from "@netlify/blobs";

const store = getStore("codes-verification");

function reponse(message, status = 200) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

async function hashCode(code) {
  const donnees = new TextEncoder().encode(code);
  const empreinte = await crypto.subtle.digest("SHA-256", donnees);
  return Array.from(new Uint8Array(empreinte))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async (req, context) => {
  if (req.method !== "POST") {
    return reponse("Méthode non autorisée", 405);
  }

  try {
    const donnees = await req.json();
    const action = donnees.action;
    const email = String(donnees.email || "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reponse("Adresse e-mail invalide", 400);
    }

    const cle = "verification-" + encodeURIComponent(email);

    if (action === "envoyer") {
      const apiKey = Netlify.env.get("RESEND_API_KEY");
      const destinataire = Netlify.env.get("RESEND_TEST_EMAIL");

      if (!apiKey || !destinataire) {
        return reponse("Configuration manquante", 500);
      }

      const code = crypto.getRandomValues(
        new Uint32Array(1)
      )[0] % 1000000;

      const codeFinal = String(code).padStart(6, "0");

      const resultat = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Witness Connect <onboarding@resend.dev>",
            to: [destinataire],
            subject: "Code de vérification Witness Connect",
            html: `<h2>Witness Connect</h2>
              <p>Ton code de vérification est :</p>
              <h1>${codeFinal}</h1>
              <p>Ce code expire dans 10 minutes.</p>`
          })
        }
      );

      if (!resultat.ok) {
        return reponse("Échec de l'envoi de l'e-mail", 502);
      }

      await store.setJSON(cle, {
        hash: await hashCode(codeFinal),
        expiration: Date.now() + 10 * 60 * 1000
      });

      return reponse("Code envoyé avec succès !");
    }

    if (action === "verifier") {
      const code = String(donnees.code || "");

      if (!/^\d{6}$/.test(code)) {
        return reponse("Le code doit contenir 6 chiffres", 400);
      }

      const enregistrement = await store.get(cle, {
        type: "json"
      });

      if (!enregistrement) {
        return reponse("Aucun code trouvé", 404);
      }

      if (Date.now() > enregistrement.expiration) {
        await store.delete(cle);
        return reponse("Code expiré", 400);
      }

      if (await hashCode(code) !== enregistrement.hash) {
        return reponse("Code incorrect", 400);
      }

      await store.delete(cle);
      return reponse("Adresse e-mail vérifiée avec succès !");
    }

    return reponse("Action inconnue", 400);

  } catch (erreur) {
    return reponse("Une erreur est survenue", 500);
  }
};
