#!/bin/bash

echo "🔍 Verifying ElevenLabs Setup..."
echo ""

ERRORS=0

if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ .env file found"

    source .env

    if [ -z "$VITE_ELEVENLABS_API_KEY" ]; then
        echo "❌ VITE_ELEVENLABS_API_KEY not set in .env"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ VITE_ELEVENLABS_API_KEY configured"
    fi

    if [ -z "$ELEVENLABS_API_KEY" ]; then
        echo "❌ ELEVENLABS_API_KEY not set in .env"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ ELEVENLABS_API_KEY configured"
    fi

    if [ -z "$VITE_SUPABASE_URL" ]; then
        echo "❌ VITE_SUPABASE_URL not set in .env"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ VITE_SUPABASE_URL configured"
    fi

    if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
        echo "❌ VITE_SUPABASE_ANON_KEY not set in .env"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ VITE_SUPABASE_ANON_KEY configured"
    fi
fi

if [ -d "supabase/functions/elevenlabs-proxy" ]; then
    echo "✅ Edge function source code found"
else
    echo "❌ Edge function source code not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✨ All checks passed!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy the edge function: npm run deploy:functions"
    echo "2. Or use the setup wizard in the application UI"
else
    echo "⚠️  Found $ERRORS issue(s)"
    echo ""
    echo "Please fix the issues above before proceeding"
    exit 1
fi
