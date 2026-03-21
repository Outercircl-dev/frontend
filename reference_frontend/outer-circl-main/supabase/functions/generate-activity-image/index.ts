import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Generating image for prompt:', prompt)

    // Check if Hugging Face API key is configured
    const apiKey = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN')
    if (!apiKey) {
      console.error('HUGGING_FACE_ACCESS_TOKEN not configured')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Image generation service not configured. Please configure Hugging Face access token.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Enhanced prompt for better activity images with Pinterest aesthetic
    const enhancedPrompt = `High-quality photo of ${prompt}, people enjoying activities, vibrant and welcoming atmosphere, good lighting, realistic photography style, Pinterest-style aesthetic, professional photography`

    console.log('Calling Hugging Face API with enhanced prompt:', enhancedPrompt)
    
    const hf = new HfInference(apiKey);

    const image = await hf.textToImage({
      inputs: enhancedPrompt,
      model: 'black-forest-labs/FLUX.1-schnell',
    });

    // Convert the blob to a base64 string using proper chunked processing
    const arrayBuffer = await image.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    console.log('Converting image to base64, size:', uint8Array.length, 'bytes')
    
    let base64 = ''
    try {
      // Convert binary to string in chunks to avoid stack overflow
      let binaryString = ''
      const chunkSize = 8192 // 8KB chunks
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length))
        binaryString += String.fromCharCode.apply(null, Array.from(chunk))
      }
      
      // Now encode the entire binary string to base64
      base64 = btoa(binaryString)
      
      console.log('Base64 conversion successful, length:', base64.length)
    } catch (conversionError) {
      console.error('Base64 conversion error:', conversionError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to convert image to base64', 
          details: conversionError instanceof Error ? conversionError.message : String(conversionError) 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Image generated successfully with Hugging Face API')
    
    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl: `data:image/png;base64,${base64}`,
        prompt: enhancedPrompt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating image:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to generate image', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})