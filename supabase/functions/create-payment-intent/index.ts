
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { cartItems } = await req.json()

    if (!cartItems || cartItems.length === 0) {
      throw new Error('No items in cart')
    }

    // Calculate total on server side
    let calculatedTotal = 0;
    const serviceFeePercentage = 0.30;
    const shippingCost = 15.00; // Fixed for MVP

    for (const item of cartItems) {
      // Fetch fresh price from DB to avoid client tampering
      const { data: listing, error } = await supabaseClient
        .from('listings')
        .select('price')
        .eq('id', item.id)
        .single()
      
      if (error || !listing) {
          console.error(`Error fetching listing ${item.id}:`, error);
          continue; // Skip or error out? Let's skip invalid items for now.
      }
      
      const price = parseFloat(listing.price);
      if (!isNaN(price)) {
          calculatedTotal += price;
      }
    }
    
    const serviceFee = calculatedTotal * serviceFeePercentage;
    const grandTotal = calculatedTotal + serviceFee + shippingCost;
    const amountInCents = Math.round(grandTotal * 100);

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        // You could add order info here
        items: JSON.stringify(cartItems.map(i => i.id))
      }
    })

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        amount: grandTotal
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
