/**
 * Compile Service — Arduino CLI wrapper
 * Accepts Arduino code, compiles via arduino-cli, returns Intel HEX output.
 * Designed to be generic for future MCU support (ESP32, RP2040, etc.)
 */

import { serve } from 'bun';

// ─── Board configurations ─────────────────────────────────────────────────
const BOARDS: Record<string, { fqbn: string; core: string }> = {
  'arduino-uno':     { fqbn: 'arduino:avr:uno',          core: 'arduino:avr' },
  'arduino-nano':    { fqbn: 'arduino:avr:nano:oldbootloader', core: 'arduino:avr' },
  'arduino-mega':    { fqbn: 'arduino:avr:mega',         core: 'arduino:avr' },
  'attiny85':        { fqbn: 'arduino:avr:attinyx5:cpu=8internal', core: 'arduino:avr' },
  // Future boards (will need additional cores):
  // 'esp32-devkit':   { fqbn: 'esp32:esp32:esp32dev',     core: 'esp32:esp32' },
  // 'raspberry-pi-pico': { fqbn: 'rp2040:rp2040:rpipico', core: 'rp2040:rp2040' },
};

const COMPILE_PORT = 3001;

serve({
  port: COMPILE_PORT,
  async fetch(req) {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Health check
    if (req.method === 'GET' && new URL(req.url).pathname === '/health') {
      return Response.json({ status: 'ok', service: 'compile-service', boards: Object.keys(BOARDS) });
    }

    // List supported boards
    if (req.method === 'GET' && new URL(req.url).pathname === '/boards') {
      return Response.json({ boards: Object.keys(BOARDS) });
    }

    // Compile endpoint
    if (req.method === 'POST' && new URL(req.url).pathname === '/compile') {
      try {
        const body = await req.json();
        const { code, boardType = 'arduino-uno' } = body;

        if (!code || typeof code !== 'string') {
          return Response.json(
            { success: false, errors: [{ message: 'No code provided' }], hex: null },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const board = BOARDS[boardType];
        if (!board) {
          return Response.json(
            { success: false, errors: [{ message: `Unsupported board: ${boardType}. Supported: ${Object.keys(BOARDS).join(', ')}` }], hex: null },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // Create temp directory for compilation
        const tmpDir = `/tmp/compile-${Date.now()}`;
        await Bun.$`mkdir -p ${tmpDir}/sketch`;

        // Write the .ino file (filename must match folder name for Arduino CLI)
        await Bun.write(`${tmpDir}/sketch/sketch.ino`, code);

        // Run arduino-cli compile (hex output is automatically generated in output-dir)
        const compile = Bun.spawn([
          'arduino-cli', 'compile',
          '--fqbn', board.fqbn,
          '--output-dir', tmpDir,
          tmpDir + '/sketch',
        ], {
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            ...process.env,
            ARDUINO_DIRECTORIES_DATA: process.env.ARDUINO_DIRECTORIES_DATA || '/app/.arduino15',
            ARDUINO_BUILD_CACHE_PATH: process.env.ARDUINO_BUILD_CACHE_PATH || '/app/.arduino15/build_cache',
          },
        });

        const stdout = await new Response(compile.stdout).text();
        const stderr = await new Response(compile.stderr).text();
        const exitCode = await compile.exited;

        // Read hex output if compilation succeeded
        let hex: string | null = null;
        if (exitCode === 0) {
          const hexPath = `${tmpDir}/sketch.ino.hex`;
          const hexFile = Bun.file(hexPath);
          if (await hexFile.exists()) {
            hex = await hexFile.text();
          }
        }

        // Clean up temp directory
        await Bun.$`rm -rf ${tmpDir}`.quiet();

        if (exitCode === 0 && hex) {
          return Response.json({
            success: true,
            errors: [],
            warnings: [],
            hex,
            boardType,
          }, { headers: { 'Access-Control-Allow-Origin': '*' } });
        } else {
          // Parse error lines from stderr (and stdout as fallback)
          const allOutput = (stderr + '\n' + stdout).split('\n');
          const errorLines = allOutput
            .filter(l => l.includes('error:') || l.includes('Error') || l.includes('fatal'))
            .map(l => {
              // Extract file:line:message pattern
              const match = l.match(/(?:sketch\.ino|\.ino):(\d+):\d+:\s*(?:error:\s*)?(.+)/i);
              if (match) {
                return { line: parseInt(match[1]), message: match[2].trim() };
              }
              return { line: 0, message: l.trim() };
            })
            .filter(l => l.message); // Remove empty entries

          // If no errors parsed but compilation failed, include raw stderr
          if (errorLines.length === 0) {
            const fallbackMsg = exitCode === 0
              ? 'Compilation succeeded but hex file not found'
              : `Compilation failed (exit ${exitCode}): ${stderr.trim() || stdout.trim() || 'unknown error'}`;
            errorLines.push({ line: 0, message: fallbackMsg });
          }

          return Response.json({
            success: false,
            errors: errorLines,
            warnings: [],
            hex: null,
            boardType,
          }, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }
      } catch (err: any) {
        return Response.json(
          { success: false, errors: [{ line: 0, message: err.message || 'Internal error' }], hex: null },
          { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`[compile-service] Running on port ${COMPILE_PORT}`);
