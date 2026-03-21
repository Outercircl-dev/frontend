
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightResponse } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightResponse(req);
  }

  const corsHeaders = getCorsHeaders(req);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan, region = 'us' } = await req.json();
    if (!plan || !['premium'].includes(plan)) {
      throw new Error("Invalid plan selected");
    }
    logStep("Plan validated", { plan, region });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Define regional pricing for premium plan
    const regionalPricing = {
      us: { amount: 999, currency: 'usd', name: 'Premium Subscription' },
      uk: { amount: 849, currency: 'gbp', name: 'Premium Subscription' },
      eu: { amount: 999, currency: 'eur', name: 'Premium Subscription' },
      ca: { amount: 1499, currency: 'cad', name: 'Premium Subscription' },
      au: { amount: 1699, currency: 'aud', name: 'Premium Subscription' },
      jp: { amount: 1599, currency: 'jpy', name: 'Premium Subscription' },
      in: { amount: 899, currency: 'inr', name: 'Premium Subscription' }
    };

    const selectedPricing = regionalPricing[region as keyof typeof regionalPricing] || regionalPricing.us;
    logStep("Pricing selected", selectedPricing);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: selectedPricing.currency,
            product_data: { name: selectedPricing.name },
            unit_amount: selectedPricing.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/membership?success=true&plan=${plan}`,
      cancel_url: `${req.headers.get("origin")}/membership?canceled=true`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        plan: plan
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email,
          plan: plan
        }
      }
    });
    
    // If no existing customer, we need to update it with metadata after creation
    if (!customerId) {
      logStep("Will update customer metadata after checkout");
    }

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
