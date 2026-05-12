/**
 * Intel HEX Parser
 * Converts Intel HEX format (.hex) to program memory (Uint16Array) for avr8js
 *
 * Intel HEX format: :LLAAAATT[DD...]CC
 *   LL   = byte count
 *   AAAA = address (16-bit)
 *   TT   = record type (00=data, 01=EOF)
 *   DD   = data bytes
 *   CC   = checksum
 */

const FLASH_SIZE = 32768; // ATmega328P has 32KB flash (16K words)

/**
 * Parse Intel HEX string into Uint16Array program memory (big-endian words)
 */
export function parseHex(hexString: string): Uint16Array {
  const progMem = new Uint16Array(FLASH_SIZE / 2); // 16K 16-bit words
  const lines = hexString.trim().split(/\r?\n/);

  let baseAddress = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed[0] !== ':') continue;

    const bytes = hexToBytes(trimmed.slice(1));
    if (bytes.length < 5) continue;

    const byteCount = bytes[0];
    const address = (bytes[1] << 8) | bytes[2];
    const recordType = bytes[3];

    switch (recordType) {
      case 0x00: {
        // Data record
        const fullAddress = baseAddress + address;
        for (let i = 0; i < byteCount; i += 2) {
          const wordAddr = (fullAddress + i) / 2;
          if (wordAddr >= progMem.length) break;
          // AVR is little-endian for flash, but avr8js expects big-endian words
          const lo = bytes[4 + i];
          const hi = (i + 1 < byteCount) ? bytes[4 + i + 1] : 0;
          progMem[wordAddr] = (hi << 8) | lo;
        }
        break;
      }
      case 0x01: {
        // End of file
        return progMem;
      }
      case 0x02: {
        // Extended segment address
        baseAddress = ((bytes[4] << 8) | bytes[5]) << 4;
        break;
      }
      case 0x04: {
        // Extended linear address
        baseAddress = ((bytes[4] << 8) | bytes[5]) << 16;
        break;
      }
      // Record types 0x03, 0x05 are start address records — ignore for AVR
    }
  }

  return progMem;
}

/** Convert hex string to byte array */
function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) break;
    bytes.push(byte);
  }
  return bytes;
}

/** Validate Intel HEX checksum */
export function validateHex(hexString: string): boolean {
  const lines = hexString.trim().split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed[0] !== ':') continue;

    const bytes = hexToBytes(trimmed.slice(1));
    if (bytes.length < 5) return false;

    let sum = 0;
    for (let i = 0; i < bytes.length; i++) {
      sum += bytes[i];
    }
    if ((sum & 0xFF) !== 0) return false;
  }
  return true;
}
