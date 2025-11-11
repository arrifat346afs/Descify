#!/bin/bash

# Test the thumbnail processor with stdin

echo "Testing thumbnail processor..."

# Small test image (1x1 red pixel PNG)
TEST_DATA="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

echo "Input length: ${#TEST_DATA}"

# Run the script with timeout
echo "$TEST_DATA" | timeout 3 node scripts/thumbnail-processor.js > /tmp/thumbnail-output.txt 2> /tmp/thumbnail-error.txt

EXIT_CODE=$?

echo "Exit code: $EXIT_CODE"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ SUCCESS!"
    echo "Output:"
    head -c 100 /tmp/thumbnail-output.txt
    echo "..."
elif [ $EXIT_CODE -eq 124 ]; then
    echo "❌ TIMEOUT - Script hung"
    echo "Errors:"
    cat /tmp/thumbnail-error.txt
else
    echo "❌ FAILED with exit code $EXIT_CODE"
    echo "Errors:"
    cat /tmp/thumbnail-error.txt
fi

