import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleAuth } from "https://esm.sh/google-auth-library@9.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VERTEX_AI_PROJECT = "scripps-ai";
const VERTEX_AI_LOCATION = "us-central1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");

    if (path === "/health") {
      const clientEmail = Deno.env.get("GCP_CLIENT_EMAIL");
      const privateKey = Deno.env.get("GCP_PRIVATE_KEY");
      return new Response(
        JSON.stringify({
          status: "ok",
          edge_function_deployed: true,
          gcp_client_email_configured: !!clientEmail,
          gcp_private_key_configured: !!privateKey,
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

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const clientEmail = Deno.env.get("GCP_CLIENT_EMAIL");
    const privateKeyRaw = Deno.env.get("GCP_PRIVATE_KEY");

    if (!clientEmail || !privateKeyRaw) {
      return new Response(
        JSON.stringify({
          error: "GCP credentials not configured",
          error_code: "MISSING_GCP_CREDENTIALS",
          setup_required: true,
          instructions: "Configure GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY secrets in Supabase Dashboard under Project Settings > Edge Functions > Secrets",
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

    const privateKey = privateKeyRaw.replace(/\\\\n/g, "\n");

    const body = await req.json();
    const { prompt, negativePrompt, image, referenceImages, parameters } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid prompt",
          error_code: "INVALID_REQUEST",
          instructions: "Provide a 'prompt' string in the request body",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      return new Response(
        JSON.stringify({
          error: "Failed to obtain access token",
          error_code: "AUTH_FAILED",
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

    const instance: any = { prompt };

    if (negativePrompt) {
      instance.negativePrompt = negativePrompt;
    }

    if (image) {
      instance.image = image;
    }

    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      instance.referenceImages = referenceImages;
    }

    const model = parameters?.model || "veo-3.1-generate-001";
    const vertexRequestBody = {
      instances: [instance],
      parameters: parameters || {
        sampleCount: 1,
        resolution: "720p",
        aspectRatio: "16:9",
        durationSeconds: 8,
      },
    };

    const endpoint = `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_AI_PROJECT}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${model}:predictLongRunning`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vertexRequestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Vertex AI error:", {
        status: response.status,
        data: responseData,
      });

      let errorCode = "VERTEX_AI_ERROR";
      let instructions = "";

      if (response.status === 401 || response.status === 403) {
        errorCode = "AUTH_ERROR";
        instructions = "Check that GCP credentials have the correct permissions for Vertex AI.";
      } else if (response.status === 429) {
        errorCode = "RATE_LIMIT_EXCEEDED";
        instructions = "Vertex AI rate limit exceeded. Please wait before trying again.";
      } else if (response.status === 400) {
        errorCode = "INVALID_REQUEST";
        instructions = "The request to Vertex AI was invalid. Check the prompt content.";
      }

      return new Response(
        JSON.stringify({
          error: responseData.error?.message || "Vertex AI request failed",
          error_code: errorCode,
          status: response.status,
          instructions,
          details: responseData,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const operationName = responseData.name;

    return new Response(
      JSON.stringify({
        success: true,
        operationName,
        message: "Video generation started. Poll using the operation name.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        error_code: "INTERNAL_ERROR",
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