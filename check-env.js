// Simple script to check if .env file is being loaded correctly
const fs = require('fs');
const path = require('path');

// First, check if .env file exists
const envPath = path.join(__dirname, '.env');
console.log('Checking for .env file at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists');
    // Read and display contents (redacting sensitive info)
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    console.log('\n.env file contents:');
    envLines.forEach(line => {
        if (line.trim() === '') return;
        
        const [key, value] = line.split('=');
        if (key && value) {
            // Redact sensitive values
            if (key === 'DISCORD_TOKEN') {
                console.log(`${key}=****${value.substring(value.length - 5)}`);
            } else {
                console.log(line);
            }
        } else {
            console.log(line);
        }
    });
} else {
    console.log('❌ .env file not found');
}

// Try to load environment variables
console.log('\nTrying to load with dotenv:');
try {
    require('dotenv').config({ path: envPath });
    console.log('✅ Dotenv loaded successfully');
} catch (error) {
    console.log('❌ Error loading dotenv:', error.message);
}

// Check if variables were loaded
console.log('\nEnvironment variables:');
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? `****${process.env.DISCORD_TOKEN.substring(process.env.DISCORD_TOKEN.length - 5)}` : 'undefined');
console.log('CLIENT_ID:', process.env.CLIENT_ID);
console.log('DEV_MODE:', process.env.DEV_MODE);
console.log('SKIP_REGISTRATION:', process.env.SKIP_REGISTRATION);

console.log('\nIf variables show as undefined, your .env file might have formatting issues or might not be in the correct location.');
console.log('Make sure each variable is on its own line with the format KEY=VALUE with no spaces around the ='); 