const fs = require('fs');
const path = require('path');

// Define all the issue patterns we want to check for
const issuePatterns = [
    // Critical issues that will cause errors
    { 
        pattern: /InteractionFlags|InteractionResponseFlags/g, 
        description: 'References to InteractionFlags or InteractionResponseFlags',
        severity: 'critical'
    },
    { 
        pattern: /flags:\s*\[[^\]]*\]/g, 
        description: 'Uses flags array syntax',
        severity: 'critical'
    },
    
    // Potential bugs that might cause problems
    {
        pattern: /interaction\.reply\([^{]/g,
        description: 'Reply without options object',
        severity: 'warning'
    },
    {
        pattern: /interaction\.deferReply\(\)/g,
        description: 'deferReply without options',
        severity: 'warning'
    },
    {
        pattern: /await\s+interaction\.\w+Reply\([^)]*\);\s*return;/g,
        description: 'Return after await (potential race condition)',
        severity: 'warning'
    },
    
    // Style/consistency issues
    {
        pattern: /console\.log\(/g,
        description: 'Console log statements (consider using a logger)',
        severity: 'info'
    },
    {
        pattern: /\/\/ TODO/g,
        description: 'TODO comments',
        severity: 'info'
    },
    
    // Security concerns
    {
        pattern: /eval\(/g,
        description: 'Use of eval (security risk)',
        severity: 'critical'
    },
    {
        pattern: /exec\(/g,
        description: 'Use of exec (security risk)',
        severity: 'critical'
    },
    
    // Error handling checks
    {
        pattern: /catch\s*\([^)]*\)\s*{\s*}/g,
        description: 'Empty catch block',
        severity: 'warning'
    },
    {
        pattern: /try\s*{[^}]*}\s*catch\s*\([^)]*\)\s*{[^}]*console\.error/g,
        description: 'Catch block only logs errors without proper handling',
        severity: 'info'
    },
    
    // Database interaction checks
    {
        pattern: /await\s+(\w+)\.findOne\([^)]*\);\s*if\s*\(\1\)\s*{\s*\1\./g,
        description: 'Potential bug: using findOne result without checking null',
        severity: 'warning'
    },
    
    // Discord.js specific issues
    {
        pattern: /message\.member\.hasPermission/g,
        description: 'Use of deprecated hasPermission method',
        severity: 'warning'
    },
    {
        pattern: /GuildMember\.hasPermission/g,
        description: 'Use of deprecated hasPermission method',
        severity: 'warning'
    },
    {
        pattern: /new MessageEmbed/g,
        description: 'Use of deprecated MessageEmbed (use EmbedBuilder instead)',
        severity: 'warning'
    },
    {
        pattern: /Intents\.FLAGS/g,
        description: 'Use of deprecated Intents.FLAGS (use GatewayIntentBits instead)',
        severity: 'warning'
    },
    {
        pattern: /Permissions\.FLAGS/g,
        description: 'Use of deprecated Permissions.FLAGS (use PermissionFlagsBits instead)',
        severity: 'warning'
    },
    {
        pattern: /interaction\.(deferReply|reply|editReply|followUp)\(\s*{[^}]*}\s*\)[^;]/g,
        description: 'Interaction reply without await',
        severity: 'critical'
    }
];

// Hold all the issues we find
const allIssues = {
    critical: [],
    warning: [],
    info: []
};

// Check a single file for issues
function checkFile(filePath) {
    console.log(`Checking ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const relativeFilePath = path.relative(__dirname, filePath);
    const lines = content.split('\n');
    const fileIssues = [];
    
    // Check each pattern
    for (const { pattern, description, severity } of issuePatterns) {
        // Reset the regex lastIndex
        pattern.lastIndex = 0;
        
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
            // Find line numbers for each match
            const lineNumbers = [];
            const contentLines = content.split('\n');
            
            for (let i = 0; i < contentLines.length; i++) {
                pattern.lastIndex = 0;
                if (pattern.test(contentLines[i])) {
                    lineNumbers.push(i + 1);
                }
            }
            
            allIssues[severity].push({
                file: relativeFilePath,
                description,
                count: matches.length,
                lines: lineNumbers
            });
        }
    }
    
    // Additional Checks that are harder to do with regex:
    
    // 1. Check for consistent error handling pattern
    const hasErrorHandling = content.includes('try {') && content.includes('catch');
    if (content.includes('await') && !hasErrorHandling && !filePath.includes('index.js')) {
        allIssues.warning.push({
            file: relativeFilePath,
            description: 'File contains async code but no error handling',
            count: 1,
            lines: ['N/A']
        });
    }
    
    // 2. Check that command files export a data and execute property
    if (filePath.includes('commands') && filePath.endsWith('.js')) {
        const dataExists = content.includes('data:') || content.includes('data =');
        const executeExists = content.includes('execute:') || content.includes('async execute');
        
        if (!dataExists || !executeExists) {
            allIssues.critical.push({
                file: relativeFilePath,
                description: 'Command file missing data or execute properties',
                count: 1,
                lines: ['N/A']
            });
        }
    }
}

// Recursively get all JS files in a directory
function getAllJsFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllJsFiles(filePath, arrayOfFiles);
        } else if (path.extname(filePath) === '.js') {
            arrayOfFiles.push(filePath);
        }
    }
    
    return arrayOfFiles;
}

// Main scanning process
console.log("🔍 Scanning project for potential issues...");

// Get all JS files
const srcPath = path.join(__dirname, 'src');
const allJsFiles = getAllJsFiles(srcPath);

// Process each file
allJsFiles.forEach(file => checkFile(file));

// Print the report
console.log("\n=== 🔍 BOT CODE ANALYSIS REPORT 🔍 ===\n");

// Count issues by severity
const criticalCount = allIssues.critical.length;
const warningCount = allIssues.warning.length;
const infoCount = allIssues.info.length;
const totalCount = criticalCount + warningCount + infoCount;

if (totalCount === 0) {
    console.log("✅ No issues found! Your bot code looks good to deploy.");
} else {
    console.log(`Found ${totalCount} potential issues:`);
    console.log(`- 🔴 Critical: ${criticalCount}`);
    console.log(`- 🟠 Warnings: ${warningCount}`);
    console.log(`- 🔵 Info: ${infoCount}`);
    
    // Print critical issues first
    if (criticalCount > 0) {
        console.log("\n🔴 CRITICAL ISSUES (Must fix before deployment):");
        allIssues.critical.forEach(issue => {
            console.log(`\n📄 ${issue.file}:`);
            console.log(`  • ${issue.description} (${issue.count} occurrences)`);
            if (issue.lines[0] !== 'N/A') {
                console.log(`    Lines: ${issue.lines.join(', ')}`);
            }
        });
    }
    
    // Print warnings
    if (warningCount > 0) {
        console.log("\n🟠 WARNINGS (Recommended to fix):");
        allIssues.warning.forEach(issue => {
            console.log(`\n📄 ${issue.file}:`);
            console.log(`  • ${issue.description} (${issue.count} occurrences)`);
            if (issue.lines[0] !== 'N/A') {
                console.log(`    Lines: ${issue.lines.join(', ')}`);
            }
        });
    }
    
    // Print info items
    if (infoCount > 0) {
        console.log("\n🔵 INFO (Consider addressing):");
        allIssues.info.forEach(issue => {
            console.log(`\n📄 ${issue.file}:`);
            console.log(`  • ${issue.description} (${issue.count} occurrences)`);
            if (issue.lines[0] !== 'N/A') {
                console.log(`    Lines: ${issue.lines.join(', ')}`);
            }
        });
    }
    
    // Deployment recommendation
    if (criticalCount > 0) {
        console.log("\n❌ DEPLOYMENT RECOMMENDATION: Fix critical issues before deploying");
    } else if (warningCount > 0) {
        console.log("\n⚠️ DEPLOYMENT RECOMMENDATION: Consider fixing warnings, but can deploy with caution");
    } else {
        console.log("\n✅ DEPLOYMENT RECOMMENDATION: Safe to deploy, consider addressing info issues later");
    }
}

// Check for Discord.js version compatibility
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const discordJsVersion = packageJson.dependencies['discord.js'];
    console.log(`\n📦 Discord.js version: ${discordJsVersion}`);
    
    // Extract major version number
    const majorVersion = parseInt(discordJsVersion.match(/\d+/)[0]);
    if (majorVersion < 14) {
        console.log("⚠️ Warning: You're using an outdated version of Discord.js. Consider upgrading to v14+");
    } else {
        console.log("✅ Using a modern version of Discord.js");
    }
} catch (error) {
    console.log("⚠️ Could not determine Discord.js version");
}

// Check for required environment variables
console.log("\n🔐 Environment Variables Check:");
const requiredEnvVars = ["DISCORD_TOKEN", "DATABASE_URL"];
const envExample = fs.existsSync(path.join(__dirname, '.env.example')) 
    ? fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8') 
    : '';

for (const envVar of requiredEnvVars) {
    if (envExample.includes(envVar)) {
        console.log(`✅ ${envVar}: Found in .env.example`);
    } else {
        console.log(`❌ ${envVar}: Not found in .env.example`);
    }
} 