
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightResponse } from "../_shared/cors.ts";
import { encryptData, hashData } from "../_shared/encryption.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-INVITATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightResponse(req);
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

    const { email, subscriptionId } = await req.json();
    if (!email || !subscriptionId) {
      throw new Error("Email and subscription ID are required");
    }
    logStep("Request data received", { email, subscriptionId });

    // Find an available slot
    const { data: availableSlot, error: slotError } = await supabaseClient
      .from('membership_slots')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'available')
      .limit(1)
      .single();

    if (slotError || !availableSlot) {
      throw new Error("No available slots found");
    }
    logStep("Available slot found", { slotId: availableSlot.id });

    // Get encryption password from environment
    const encryptionPassword = Deno.env.get('INVITATION_ENCRYPTION_KEY');
    if (!encryptionPassword) {
      throw new Error('Encryption key not configured');
    }
    
    // Encrypt email using AES-256-GCM
    const emailEncrypted = await encryptData(email, encryptionPassword);
    
    // Create hash for lookups (allows searching without decryption)
    const emailHash = await hashData(email);
    
    // Create invitation with encrypted email
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitations')
      .insert({
        subscription_id: subscriptionId,
        slot_id: availableSlot.id,
        email_encrypted: emailEncrypted,
        email_hash: emailHash,
        invited_by: user.id
      })
      .select()
      .single();

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`);
    }
    logStep("Invitation created", { invitationId: invitation.id, token: invitation.invitation_token });

    // Update slot status to invited
    const { error: updateError } = await supabaseClient
      .from('membership_slots')
      .update({ status: 'invited' })
      .eq('id', availableSlot.id);

    if (updateError) {
      logStep("Failed to update slot status", updateError);
    }

    // TODO: In a real implementation, you would send an email here using a service like SendGrid, Resend, etc.
    // For now, we'll just log the invitation details
    const invitationUrl = `${req.headers.get("origin")}/accept-invitation?token=${invitation.invitation_token}`;
    logStep("Invitation email would be sent", { 
      to: email, 
      invitationUrl,
      invitedBy: user.email 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      invitationId: invitation.id,
      invitationUrl // Return URL for testing purposes
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-invitation", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
