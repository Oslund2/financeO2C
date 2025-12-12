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
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");

    console.log('ElevenLabs API key configured:', !!apiKey);
    console.log('API key length:', apiKey?.length || 0);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Eleven Labs API key is not configured in edge function environment" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/voices";
    const method = url.searchParams.get("method") || "GET";

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

      return new Response(JSON.stringify({
        error: data.detail?.message || data.message || data.error || 'ElevenLabs API error',
        status: response.status,
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