#!/usr/bin/env node

/**
 * Thumbnail Processor using Sharp
 * This script is called by Tauri to generate thumbnails using Sharp
 * Reads base64 data from stdin to avoid "Argument list too long" error
 */

// Log startup
process.stderr.write('Sharp processor starting...\n');

// Set up stdin listeners IMMEDIATELY at module load time
const chunks = [];
let stdinClosed = false;
let stdinResolve;
let stdinReject;

const stdinPromise = new Promise((resolve, reject) => {
  stdinResolve = resolve;
  stdinReject = reject;
});

// Set timeout to prevent hanging
const timeoutId = setTimeout(() => {
  if (!stdinClosed) {
    process.stderr.write('Timeout: No data received within 5000ms\n');
    stdinReject(new Error('Timeout: No data received within 5000ms'));
  }
}, 5000);

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  chunks.push(chunk);
  process.stderr.write(`Received ${chunk.length} bytes\n`);
});

process.stdin.on('end', () => {
  clearTimeout(timeoutId);
  stdinClosed = true;
  const data = chunks.join('');
  process.stderr.write(`Stdin closed, total: ${data.length} bytes\n`);
  stdinResolve(data);
});

process.stdin.on('error', (err) => {
  clearTimeout(timeoutId);
  stdinClosed = true;
  stdinReject(err);
});

// Resume stdin in case it's paused
process.stdin.resume();

process.stderr.write('Stdin listeners set up\n');

/**
 * Main processing function
 */
async function main() {
  try {
    // Load Sharp while stdin is being read
    process.stderr.write('Loading Sharp...\n');
    let sharp;
    try {
      sharp = (await import('sharp')).default;
      process.stderr.write('Sharp loaded successfully\n');
    } catch (error) {
      process.stderr.write(`Failed to load Sharp: ${error.message}\n`);
      process.exit(1);
    }

    // Wait for stdin data
    process.stderr.write('Waiting for stdin data...\n');
    const input = await stdinPromise;

    if (!input || input.trim().length === 0) {
      process.stderr.write('Error: No input data received from stdin\n');
      process.exit(1);
    }

    process.stderr.write(`Processing ${input.length} bytes of input\n`);

    let inputBuffer;

    // Check if input is a base64 data URL
    if (input.startsWith('data:')) {
      // Extract base64 data from data URL
      const base64Data = input.split(',')[1];
      inputBuffer = Buffer.from(base64Data, 'base64');
      process.stderr.write(`Decoded data URL to ${inputBuffer.length} bytes\n`);
    } else if (input.startsWith('base64:')) {
      // Direct base64 string
      const base64Data = input.substring(7);
      inputBuffer = Buffer.from(base64Data, 'base64');
      process.stderr.write(`Decoded base64 to ${inputBuffer.length} bytes\n`);
    } else {
      // Assume it's raw base64
      inputBuffer = Buffer.from(input.trim(), 'base64');
      process.stderr.write(`Decoded raw base64 to ${inputBuffer.length} bytes\n`);
    }

    process.stderr.write('Processing with Sharp...\n');

    // Generate thumbnail using Sharp
    const thumbnail = await sharp(inputBuffer)
      .resize(512, 512, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 70,
        progressive: true,
      })
      .toBuffer();

    process.stderr.write(`Thumbnail generated: ${thumbnail.length} bytes\n`);

    // Convert to base64 data URL
    const base64 = thumbnail.toString('base64');
    const dataURL = `data:image/jpeg;base64,${base64}`;

    process.stderr.write(`Outputting ${dataURL.length} bytes\n`);

    // Output the result (Tauri will capture this)
    console.log(dataURL);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error processing thumbnail: ${error.message}\n${error.stack}\n`);
    process.exit(1);
  }
}

main();

