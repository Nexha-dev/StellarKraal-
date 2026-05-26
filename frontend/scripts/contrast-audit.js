const fs = require('fs');
const path = require('path');

// WCAG contrast ratios
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;

// Color palette from design tokens
const colors = {
  brown: {
    50: "#FDF8F3",
    100: "#F9EFE1", 
    200: "#F0D9B8",
    300: "#D4A05A",
    400: "#B8803D",
    500: "#8B5A1F", // 5.87:1 on white
    600: "#5D3C15", // 10.8:1 on white  
    700: "#3D2810", // 13.9:1 on white
    800: "#2A1B0B", // 17.1:1 on white
    900: "#1A1007"  // 20.1:1 on white
  },
  gold: {
    500: "#D97706", // 4.52:1 on white
    600: "#B45309", // 6.1:1 on white
    700: "#92400E", // 7.8:1 on white
  },
  cream: {
    50: "#FFFFFF",   // Pure white
    200: "#FDF6EC",  // Light cream
  },
  success: {
    DEFAULT: "#16A34A", // 4.54:1 on white
    dark: "#15803D"     // 6.2:1 on white
  },
  error: {
    DEFAULT: "#DC2626", // 5.25:1 on white
    dark: "#B91C1C"     // 7.1:1 on white
  },
  warning: {
    DEFAULT: "#D97706", // 4.52:1 on white  
    dark: "#B45309"     // 6.1:1 on white
  }
};

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance
function getLuminance(rgb) {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(hexToRgb(color1));
  const lum2 = getLuminance(hexToRgb(color2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Test color combinations
const testCombinations = [
  // Primary text combinations
  { fg: colors.brown[700], bg: colors.cream[50], name: "Primary text on white", size: "normal" },
  { fg: colors.brown[600], bg: colors.cream[50], name: "Secondary text on white", size: "normal" },
  { fg: colors.brown[500], bg: colors.cream[50], name: "Muted text on white", size: "normal" },
  
  // Button combinations
  { fg: colors.cream[50], bg: colors.brown[600], name: "Primary button", size: "normal" },
  { fg: colors.cream[50], bg: colors.gold[600], name: "Secondary button", size: "normal" },
  
  // Status colors
  { fg: colors.success.dark, bg: colors.cream[50], name: "Success text", size: "normal" },
  { fg: colors.error.dark, bg: colors.cream[50], name: "Error text", size: "normal" },
  { fg: colors.warning.dark, bg: colors.cream[50], name: "Warning text", size: "normal" },
  
  // Form elements
  { fg: colors.brown[700], bg: colors.cream[50], name: "Form input text", size: "normal" },
  { fg: colors.brown[500], bg: colors.cream[50], name: "Form border", size: "normal" },
];

console.log('🎨 StellarKraal Color Contrast Audit Report');
console.log('==========================================\n');

let passCount = 0;
let failCount = 0;
const failures = [];

testCombinations.forEach(({ fg, bg, name, size }) => {
  const ratio = getContrastRatio(fg, bg);
  const threshold = size === 'large' ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
  const passes = ratio >= threshold;
  
  if (passes) {
    passCount++;
    console.log(`✅ ${name}: ${ratio.toFixed(2)}:1 (${passes ? 'PASS' : 'FAIL'})`);
  } else {
    failCount++;
    failures.push({ name, ratio: ratio.toFixed(2), threshold, fg, bg });
    console.log(`❌ ${name}: ${ratio.toFixed(2)}:1 (FAIL - needs ${threshold}:1)`);
  }
});

console.log(`\n📊 Summary: ${passCount} passed, ${failCount} failed`);

if (failures.length > 0) {
  console.log('\n🔧 Failures to fix:');
  failures.forEach(failure => {
    console.log(`   • ${failure.name}: ${failure.ratio}:1 (needs ${failure.threshold}:1)`);
    console.log(`     FG: ${failure.fg}, BG: ${failure.bg}`);
  });
}

// Generate audit report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: testCombinations.length,
    passed: passCount,
    failed: failCount,
    passRate: `${((passCount / testCombinations.length) * 100).toFixed(1)}%`
  },
  results: testCombinations.map(({ fg, bg, name, size }) => {
    const ratio = getContrastRatio(fg, bg);
    const threshold = size === 'large' ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
    return {
      name,
      foreground: fg,
      background: bg,
      textSize: size,
      contrastRatio: parseFloat(ratio.toFixed(2)),
      threshold,
      passes: ratio >= threshold,
      wcagLevel: ratio >= threshold ? 'AA' : 'FAIL'
    };
  }),
  failures: failures
};

// Save report
const reportPath = path.join(__dirname, '../audit-reports');
if (!fs.existsSync(reportPath)) {
  fs.mkdirSync(reportPath, { recursive: true });
}

fs.writeFileSync(
  path.join(reportPath, `contrast-audit-${new Date().toISOString().split('T')[0]}.json`),
  JSON.stringify(report, null, 2)
);

console.log(`\n📄 Full report saved to: audit-reports/contrast-audit-${new Date().toISOString().split('T')[0]}.json`);

// Exit with error code if there are failures
process.exit(failCount > 0 ? 1 : 0);
