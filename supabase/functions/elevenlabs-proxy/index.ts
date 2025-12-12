import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/voices";
    const method = url.searchParams.get("method") || "GET";

    if (path === "/health") {
      const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
      return new Response(
        JSON.stringify({
          status: "ok",
          edge_function_deployed: true,
          api_key_configured: !!apiKey,
          api_key_length: apiKey?.length || 0,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");

    console.log('ElevenLabs API key configured:', !!apiKey);
    console.log('API key length:', apiKey?.length || 0);

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "ElevenLabs API key not configured in Supabase",
          error_code: "MISSING_API_KEY",
          setup_required: true,
          instructions: "Configure ELEVENLABS_API_KEY secret in Supabase Dashboard under Project Settings > Edge Functions > Secrets"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Build the Eleven Labs API URL
    const elevenLabsUrl = `${ELEVENLABS_API_BASE}${path}`;

    // Get request body if it's a POST request
    let body = null;
    if (method === "POST" && req.body) {
      body = await req.text();
    }

    // Forward the request to Eleven Labs API
    const headers: HeadersInit = {
      "xi-api-key": apiKey,
    };

    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      headers["Accept"] = "audio/mpeg";
    }

    const response = await fetch(elevenLabsUrl, {
      method,
      headers,
      body,
    });

    // Handle audio responses
    if (response.headers.get("content-type")?.includes("audio")) {
      const audioData = await response.arrayBuffer();
      return new Response(audioData, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
        },
      });
    }

    // Handle JSON responses
    const data = await response.json();

    // If ElevenLabs returns an error, include more details
    if (!response.ok) {
      console.error('ElevenLabs API error:', {
        status: response.status,
        data,
        url: elevenLabsUrl
      });

      let errorCode = "ELEVENLABS_API_ERROR";
      let instructions = "";

      if (response.status === 401) {
        errorCode = "INVALID_API_KEY";
        instructions = "The API key configured in Supabase is invalid. Please verify your ElevenLabs API key in the Supabase Dashboard.";
      } else if (response.status === 429) {
        errorCode = "RATE_LIMIT_EXCEEDED";
        instructions = "ElevenLabs API rate limit exceeded. Please wait before trying again or upgrade your ElevenLabs plan.";
      } else if (response.status === 403) {
        errorCode = "INSUFFICIENT_QUOTA";
        instructions = "Insufficient quota on your ElevenLabs account. Please check your usage and plan limits.";
      }

      return new Response(JSON.stringify({
        error: data.detail?.message || data.message || data.error || 'ElevenLabs API error',
        error_code: errorCode,
        status: response.status,
        instructions,
        details: data
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});