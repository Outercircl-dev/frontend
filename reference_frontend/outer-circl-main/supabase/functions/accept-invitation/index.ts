
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACCEPT-INVITATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { invitationToken } = await req.json();
    if (!invitationToken) {
      throw new Error("Invitation token is required");
    }
    logStep("Request data received", { invitationToken });

    // Generate email hash for secure comparison using Web Crypto API (Phase 1b)
    const encoder = new TextEncoder();
    const data = encoder.encode(user.email);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const userEmailHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    logStep("Generated email hash for lookup", { emailHash: userEmailHash.substring(0, 8) + '...' });

    // Find the invitation using email_hash instead of plain email
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitations')
      .select('*, membership_slots(*)')
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .eq('email_hash', userEmailHash)
      .single();

    if (invitationError || !invitation) {
      throw new Error("Invalid or expired invitation");
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseClient
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      throw new Error("Invitation has expired");
    }
    logStep("Valid invitation found", { invitationId: invitation.id });

    // Update the slot with the user
    const { error: slotUpdateError } = await supabaseClient
      .from('membership_slots')
      .update({ 
        user_id: user.id, 
        status: 'active' 
      })
      .eq('id', invitation.slot_id);

    if (slotUpdateError) {
      throw new Error(`Failed to update slot: ${slotUpdateError.message}`);
    }

    // Mark invitation as accepted
    const { error: invitationUpdateError } = await supabaseClient
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    if (invitationUpdateError) {
      logStep("Warning: Failed to update invitation status", invitationUpdateError);
    }

    logStep("Invitation accepted successfully", { 
      userId: user.id, 
      slotId: invitation.slot_id,
      subscriptionId: invitation.subscription_id
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Invitation accepted successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in accept-invitation", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
