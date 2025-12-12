#!/bin/bash

set -e

echo "🚀 Deploying Supabase Edge Functions..."
echo ""

if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Please create a .env file with your API keys"
    exit 1
fi

source .env

echo "📦 Deploying elevenlabs-proxy function..."
supabase functions deploy elevenlabs-proxy

echo ""
echo "🔐 Configuring secrets..."

if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "⚠️  Warning: ELEVENLABS_API_KEY not found in .env"
    echo "Skipping secret configuration"
else
    echo "Setting ELEVENLABS_API_KEY secret..."
    supabase secrets set ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY"
    echo "✅ Secret configured"
fi

echo ""
echo "✨ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify the function is deployed in Supabase Dashboard"
echo "2. Test the integration in the Voice Generation tab"
echo "3. Check the health endpoint to confirm configuration"
