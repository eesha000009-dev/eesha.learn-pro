import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompileRequest {
  code: string;
  boardType: string;
  language?: string;
}

interface CompileError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

interface CompileStats {
  lines: number;
  functions: number;
  variables: number;
  includes: string[];
  pinUsage: Record<string, string[]>;
}

interface CompileResponse {
  success: boolean;
  errors: CompileError[];
  warnings: CompileError[];
  hex: string | null;
  stats: CompileStats;
  boardType?: string;
}

// ---------------------------------------------------------------------------
// Compile service endpoint (proxies to mini-service)
// ---------------------------------------------------------------------------

const COMPILE_SERVICE_URL = 'http://localhost:3001';

export async function POST(request: Request): Promise<NextResponse<CompileResponse>> {
  try {
    const body: CompileRequest = await request.json();
    const { code, boardType = 'arduino-uno' } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          success: false,
          errors: [{ line: 0, message: 'No code provided', severity: 'error' }],
          warnings: [],
          hex: null,
          stats: { lines: 0, functions: 0, variables: 0, includes: [], pinUsage: {} },
        },
        { status: 400 },
      );
    }

    // Try to compile via the real compile-service
    try {
      const res = await fetch(`${COMPILE_SERVICE_URL}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, boardType }),
      });

      if (res.ok) {
        const data = await res.json();

        // Parse basic stats from code
        const lines = code.split(/\r?\n/);
        const includes = lines
          .map(l => l.trim())
          .filter(l => /^#include\s+[<"]([^>"]+)[">]/.test(l))
          .map(l => l.match(/^#include\s+[<"]([^>"]+)[">]/)?.[1] || '');

        const pinUsage: Record<string, string[]> = {};
        const pinRegex = /(?:pinMode|digitalWrite|digitalRead|analogWrite|analogRead)\s*\(\s*(\w+)\s*,/g;
        let match;
        while ((match = pinRegex.exec(code)) !== null) {
          const pin = match[1];
          if (!pinUsage[pin]) pinUsage[pin] = [];
          const fn = match[0].split('(')[0];
          if (!pinUsage[pin].includes(fn)) pinUsage[pin].push(fn);
        }

        return NextResponse.json({
          success: data.success,
          errors: (data.errors || []).map((e: any) => ({
            line: e.line || 0,
            message: e.message || 'Unknown error',
            severity: 'error',
          })),
          warnings: (data.warnings || []).map((w: any) => ({
            line: w.line || 0,
            message: w.message || 'Unknown warning',
            severity: 'warning',
          })),
          hex: data.hex || null,
          stats: {
            lines: lines.length,
            functions: 0,
            variables: 0,
            includes,
            pinUsage,
          },
          boardType,
        });
      }

      // Compile service returned an error
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        {
          success: false,
          errors: errorData?.errors || [{ line: 0, message: 'Compilation service error', severity: 'error' }],
          warnings: [],
          hex: null,
          stats: { lines: code.split(/\r?\n/).length, functions: 0, variables: 0, includes: [], pinUsage: {} },
        },
        { status: 200 },
      );
    } catch {
      // Compile service not available — return a useful error
      return NextResponse.json({
        success: false,
        errors: [{
          line: 0,
          message: 'Compilation service is not available. Please wait a moment and try again.',
          severity: 'error',
        }],
        warnings: [],
        hex: null,
        stats: { lines: code.split(/\r?\n/).length, functions: 0, variables: 0, includes: [], pinUsage: {} },
      });
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        errors: [{ line: 0, message: 'Internal server error during compilation', severity: 'error' }],
        warnings: [],
        hex: null,
        stats: { lines: 0, functions: 0, variables: 0, includes: [], pinUsage: {} },
      },
      { status: 500 },
    );
  }
}

// GET endpoint to list supported boards
export async function GET() {
  try {
    const res = await fetch(`${COMPILE_SERVICE_URL}/boards`);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback if compile service is down
  }

  return NextResponse.json({
    boards: ['arduino-uno', 'arduino-nano', 'arduino-mega', 'attiny85'],
  });
}
