#!/bin/bash

AUDIO_ABSOLUTE_PATH=$(readlink -f server/test.m4a)
SPEACHES_BASE_URL=$(grep SPEACHES_BASE_URL .env | cut -d '=' -f2)
SPEACHES_API_KEY=$(grep SPEACHES_API_KEY .env | cut -d '=' -f2)

echo "Running recording test..."
echo ""

# note: curl requires absolute path after @
curl $SPEACHES_BASE_URL/v1/audio/transcriptions \
  -H "Authorization: Bearer $SPEACHES_API_KEY" \
  -F file=@/$AUDIO_ABSOLUTE_PATH \
  -F model=Systran/faster-whisper-large-v3

echo ""
echo ""
echo "Actual transcription:"
echo " \"Hello, hello, this is a test. Yessah blessah\" "