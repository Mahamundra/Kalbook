#!/bin/bash

# Script to create an admin user for business 899081 with phone 0546147474
# This uses the API endpoint, so the Next.js server must be running

BUSINESS_ID="899081"
PHONE="0546147474"
NAME="Admin User"
EMAIL="admin-${BUSINESS_ID}@kalbook.local"  # Placeholder email

# Default to localhost:3000, but can be overridden
API_URL="${API_URL:-http://localhost:3000}"

echo "Creating admin user for business ${BUSINESS_ID}..."
echo "Phone: ${PHONE}"
echo "Name: ${NAME}"
echo "Email: ${EMAIL}"
echo ""

# Make the API call
curl -X POST "${API_URL}/api/admin/create-user" \
  -H "Content-Type: application/json" \
  -d "{
    \"businessId\": \"${BUSINESS_ID}\",
    \"email\": \"${EMAIL}\",
    \"name\": \"${NAME}\",
    \"phone\": \"${PHONE}\"
  }" | jq '.'

echo ""
echo "Done!"






