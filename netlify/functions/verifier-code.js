import { getStore } from "@netlify/blobs";
export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ message: "Méthode non autorisée" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const apiKey = Netlify.env.get("RESEND_API_KEY");
  const email = Netlify.env.get("RESEND_TEST_EMAIL");

  if (!apiKey || !email) {
    return new Response(
      JSON.stringify({ message: "Configuration manquante sur Netlify" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const resultat = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Witness Connect <onboarding@resend.dev>",
        to: [email],
        subject: "Test Witness Connect",
        html: "<h2>Bonjour !</h2><p>Ton service d'envoi d'e-mails fonctionne.</p>"
      })
    });

    const donnees = await resultat.json();

    if (!resultat.ok) {
      return new Response(
        JSON.stringify({
          message: "Échec de l'envoi",
          detail: donnees
        }),
        {
          status: resultat.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "E-mail envoyé avec succès !" }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (erreur) {
    return new Response(
      JSON.stringify({ message: "Erreur lors de l'envoi" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
