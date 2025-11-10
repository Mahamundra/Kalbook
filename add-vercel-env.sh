#!/bin/bash
# Script to add environment variables to Vercel from .env.local

if [ ! -f .env.local ]; then
  echo "Error: .env.local file not found"
  exit 1
fi

echo "Adding environment variables to Vercel..."

# Read .env.local and add each variable
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Remove quotes from value if present
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  
  # Skip if value is empty
  [[ -z "$value" ]] && continue
  
  echo "Adding $key..."
  echo "$value" | npx vercel env add "$key" production <<< "$value" 2>/dev/null || echo "  (may already exist or failed)"
done < .env.local

echo "Done! Environment variables added."
