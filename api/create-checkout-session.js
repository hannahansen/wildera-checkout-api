import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Lock it down so nobody can pass random Stripe price IDs
const ALLOWED_PRICE_IDS = new Set([
  "price_REPLACE_ME_1",
  "price_REPLACE_ME_2"
  // add your real price ids here
]);

export default async function handler(req, res) {
  // Basic CORS so your GitHub Pages site can call this
  res.setHeader("Access-Control-Allow-Origin", "https://wildera.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing items" });
    }

    // Validate inputs
    const line_items = items.map((it) => {
      const priceId = String(it.priceId || "");
      const quantity = Math.max(1, Math.min(99, Number(it.quantity || 1)));

      if (!ALLOWED_PRICE_IDS.has(priceId)) {
        throw new Error("Invalid priceId: " + priceId);
      }

      return { price: priceId, quantity };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      // No need to create new pages: return to cart with query params
      success_url: "https://wildera.github.io/cart.html?success=1",
      cancel_url: "https://wildera.github.io/cart.html?canceled=1"
    });

    // Stripe recommends redirecting to the returned URL
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(400).json({ error: err?.message || "Checkout session failed" });
  }
}