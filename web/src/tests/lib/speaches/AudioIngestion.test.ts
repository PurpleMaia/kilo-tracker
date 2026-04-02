import { POST } from '@/app/api/audio/transcribe/route';
import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration tests for Speaches Audio Ingestion API
 *
 * These tests make real API calls to the Speaches service.
 * Ensure the Speaches server is running before executing these tests.
 *
 * Prerequisites:
 * - Speaches server running at SPEACHES_BASE_URL (default: http://localhost:8000)
 * - Valid SPEACHES_API_KEY in .env
 * - Test audio file at src/tests/lib/speaches/fixtures/test-audio.wav
 */

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TEST_AUDIO_PATH = path.join(FIXTURES_DIR, 'test-audio.wav');

describe('Speaches Audio Ingestion Integration Tests', () => {
  // Check if Speaches server is available before running tests
  beforeAll(async () => {
    const baseUrl = process.env.SPEACHES_BASE_URL;
    if (!baseUrl) {
      console.warn('SPEACHES_BASE_URL not set, skipping integration tests');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/health`).catch(() => null);
      if (!response || !response.ok) {
        console.warn(`Speaches server not available at ${baseUrl}, some tests may fail`);
      }
    } catch {
      console.warn('Could not connect to Speaches server');
    }
  });

  describe('POST /api/audio/transcribe', () => {
    test('should transcribe audio file from fixtures', async () => {
      // Skip if no test audio file exists
      if (!fs.existsSync(TEST_AUDIO_PATH)) {
        console.log(`Test audio file not found at ${TEST_AUDIO_PATH}, skipping test`);
        return;
      }

      const audioBuffer = fs.readFileSync(TEST_AUDIO_PATH);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioFile = new File([audioBlob], 'test-audio.wav', { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('file', audioFile);

      const request = new NextRequest('http://localhost:3000/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBeDefined();
      expect(typeof data.text).toBe('string');
    }, 30000); // 30 second timeout for API calls

    test('should transcribe programmatically generated audio', async () => {
      // Generate a simple WAV file with silence (valid WAV format)
      const wavBuffer = generateSilentWav(1); // 1 second of silence

      const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      const audioFile = new File([audioBlob], 'generated-audio.wav', { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('file', audioFile);

      const request = new NextRequest('http://localhost:3000/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      // Silent audio should return 200 with empty or minimal transcription
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('text');
    }, 30000); // 30 second timeout for API calls

    test('should return 400 when no audio file is provided', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No audio sent');
    });

    test('should handle large audio files', async () => {
      // Generate a longer WAV file (5 seconds)
      const wavBuffer = generateSilentWav(5);

      const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      const audioFile = new File([audioBlob], 'large-audio.wav', { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('file', audioFile);

      const request = new NextRequest('http://localhost:3000/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('text');
    }, 30000); // 30 second timeout for larger files
  });
});

/**
 * Generate a valid WAV file buffer with silence
 * @param durationSeconds - Duration of the audio in seconds
 * @returns Buffer containing valid WAV data
 */
function generateSilentWav(durationSeconds: number): Buffer {
  const sampleRate = 16000; // 16kHz - common for speech recognition
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const fileSize = 44 + dataSize; // 44 bytes for WAV header

  const buffer = Buffer.alloc(fileSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt subchunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, offset); offset += 2; // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, offset); offset += 4; // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, offset); offset += 2; // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data subchunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Audio data (silence = zeros, already initialized by Buffer.alloc)

  return buffer;
}
