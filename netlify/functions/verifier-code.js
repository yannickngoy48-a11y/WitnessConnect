export default async (req, context) => {
  return new Response(
    JSON.stringify({
      message: "Service de vérification prêt"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
};
