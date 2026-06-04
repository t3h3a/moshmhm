const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localStorePath = path.resolve(__dirname, '..', 'artifacts', 'api-server', 'data', 'local-store.json');
const mockAppPath = path.resolve(__dirname, '..', 'artifacts', 'api-server', 'src', 'mock-app.ts');

// Do not restore source files from git during build. The project now keeps the
// fixed Arabic catalog and API defaults in source; restoring here reintroduces
// mojibake and old rank/service data before every build.
console.log("Skipping git restore; healing current source files in place...");

// CP-1256 translation map builder
const charToByteMap = new Map();

// Populate decoding map dynamically
const decoder = new TextDecoder("windows-1256");
let decoderSuccess = false;
for (let i = 0x80; i <= 0xFF; i++) {
  try {
    const char = decoder.decode(new Uint8Array([i]));
    if (char && char !== "") {
      charToByteMap.set(char, i);
      decoderSuccess = true;
    }
  } catch (e) {}
}

if (!decoderSuccess) {
  console.log("TextDecoder windows-1256 not supported. Using robust hardcoded CP-1256 fallback mapping.");
  const cp1256CharsList = [
    '€', ' ', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', ' ', 'Ž', ' ',
    ' ', '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', ' ', 'ž', 'Ÿ',
    ' ', '¡', '¢', '£', '¤', '¥', '¦', '§', '¨', '©', 'ª', '«', '¬', '­', '®', '¯',
    '°', '±', '²', '³', '´', 'µ', '¶', '·', '¸', '¹', 'º', '»', '¼', '½', '¾', '¿',
    'ـ', 'ء', 'آ', 'أ', 'ؤ', 'إ', 'ئ', 'ا', 'ب', 'ة', 'ت', 'ث', 'ج', 'ح', 'خ', 'د',
    'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', '×', 'ط', 'ظ', 'ع', 'غ', 'ـ', 'ف', 'ق', 'ك',
    'ل', 'م', 'ن', 'ه', 'و', 'ى', 'ي', 'ً', 'ٌ', 'ٍ', 'َ', 'ُ', 'ِ', 'ّ', 'ْ', '÷'
  ];
  for (let i = 0; i < cp1256CharsList.length; i++) {
    charToByteMap.set(cp1256CharsList[i], 0x80 + i);
  }
}

function hasCP1256Mojibake(str) {
  if (typeof str !== "string") return false;
  const patterns = [
    'ط§', 'ط¨', 'طھ', 'ط«', 'ط¬', 'ط­', 'ط®', 'ط¯', 'ط°', 'ط±', 'ط²', 'ط³', 'ط´', 'طµ', 'ط¶', 'ط·', 'ط¸', 'ط¹',
    'ط؛', 'ظ„', 'ظ…', 'ظ†', 'ظ‡', 'ظˆ', 'ظa', 'ط©', 'ط£', 'ط¥', 'طآ', 'ط¤', 'ط¦', 'ظ‰', 'ط،', 'ظٹ', 'ظy'
  ];
  return patterns.some(p => str.includes(p));
}

function healMojibake(str) {
  if (!str || !hasCP1256Mojibake(str)) return str;
  try {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = char.charCodeAt(0);
      if (code < 128) {
        bytes.push(code);
      } else {
        const byteVal = charToByteMap.get(char);
        if (byteVal !== undefined) {
          bytes.push(byteVal);
        } else {
          bytes.push(code & 0xFF);
        }
      }
    }
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  } catch {
    return str;
  }
}

function healRecursive(obj) {
  if (typeof obj === "string") {
    return healMojibake(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(healRecursive);
  }
  if (obj !== null && typeof obj === "object") {
    const copy = {};
    for (const key of Object.keys(obj)) {
      copy[key] = healRecursive(obj[key]);
    }
    return copy;
  }
  return obj;
}

// 1. Heal local-store.json
if (fs.existsSync(localStorePath)) {
  console.log("Healing local-store.json...");
  try {
    const content = fs.readFileSync(localStorePath, "utf8");
    const parsed = JSON.parse(content);
    const healed = healRecursive(parsed);
    fs.writeFileSync(localStorePath, JSON.stringify(healed, null, 2), "utf8");
    console.log("Successfully healed local-store.json!");
  } catch (err) {
    console.error("Failed to heal local-store.json:", err);
  }
}

// 2. Heal mock-app.ts static arrays and smart AI response
if (fs.existsSync(mockAppPath)) {
  console.log("Healing mock-app.ts...");
  try {
    let content = fs.readFileSync(mockAppPath, "utf8");

    // Clean syntax corruption if any leftover
    content = content.replace(/\}§[^\n]*\n\s*\}/g, '}');

    // Keep getSmartAIResponse from source. Older healing templates carried
    // already-corrupted Arabic text, so the build must not rewrite this block.

    // Now, decode all remaining quotes in mock-app.ts to ensure absolutely no Mojibake remains
    const quoteRegex = /(["'])(.*?)\1/g;
    let healedContent = content.replace(quoteRegex, (match, quote, str) => {
      if (hasCP1256Mojibake(str)) {
        const decoded = healMojibake(str);
        console.log(`Decoded mock-app.ts literal: ${str} -> ${decoded}`);
        return `${quote}${decoded}${quote}`;
      }
      return match;
    });

    fs.writeFileSync(mockAppPath, healedContent, "utf8");
    console.log("Successfully healed mock-app.ts file literals!");
  } catch (err) {
    console.error("Failed to heal mock-app.ts file literals:", err);
  }
}
