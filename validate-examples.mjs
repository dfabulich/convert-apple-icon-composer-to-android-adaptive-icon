import fs from 'fs';
import path from 'path';
import { Validator } from 'jsonschema';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const examplesDir = path.join(__dirname, 'example-icon-composer-icons');
const schemaPath = path.join(__dirname, 'specs', 'apple-icon-composer-json-schema.json');

// Load the JSON schema
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Create a validator instance
const validator = new Validator();

// Find all .icon directories
const entries = fs.readdirSync(examplesDir, { withFileTypes: true });
const iconDirs = entries
  .filter(entry => entry.isDirectory() && entry.name.endsWith('.icon'))
  .map(entry => entry.name);

if (iconDirs.length === 0) {
  console.error('No .icon directories found in', examplesDir);
  process.exit(1);
}

console.log(`Found ${iconDirs.length} .icon directory(ies):\n`);

let totalErrors = 0;
let validatedCount = 0;

for (const iconDir of iconDirs) {
  const iconJsonPath = path.join(examplesDir, iconDir, 'icon.json');
  
  if (!fs.existsSync(iconJsonPath)) {
    console.error(`⚠️  ${iconDir}: icon.json not found`);
    totalErrors++;
    continue;
  }

  try {
    const iconJson = JSON.parse(fs.readFileSync(iconJsonPath, 'utf8'));
    const result = validator.validate(iconJson, schema);

    if (result.valid) {
      console.log(`✅ ${iconDir}: Valid`);
      validatedCount++;
    } else {
      console.error(`❌ ${iconDir}: Validation failed`);
      totalErrors++;
      
      // Group errors by property path for better readability
      const errorsByPath = {};
      for (const error of result.errors) {
        const path = error.property || 'root';
        if (!errorsByPath[path]) {
          errorsByPath[path] = [];
        }
        errorsByPath[path].push(error.message);
      }

      // Print errors
      for (const [errorPath, messages] of Object.entries(errorsByPath)) {
        console.error(`  At ${errorPath}:`);
        for (const message of messages) {
          console.error(`    - ${message}`);
        }
      }
      console.error('');
    }
  } catch (error) {
    console.error(`⚠️  ${iconDir}: Failed to parse icon.json - ${error.message}`);
    totalErrors++;
  }
}

console.log(`\nSummary: ${validatedCount} valid, ${totalErrors} error(s)`);

if (totalErrors > 0) {
  process.exit(1);
}
