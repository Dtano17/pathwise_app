#!/bin/bash
# Re-enrich Entertainment category entries with low confidence

echo "Re-enriching Entertainment category entries..."
curl -X POST http://localhost:5000/api/journal/entries/enrich/low-confidence \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .auth-cookie 2>/dev/null || echo '')" \
  -d '{
    "confidenceThreshold": 0.7,
    "categories": ["Entertainment", "Movies & TV Shows"]
  }' | jq '.'

echo ""
echo "Done! Check the response above for stats."
