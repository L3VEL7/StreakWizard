const fs = require('fs');
const path = require('path');

// Patterns that might indicate problems
const issuePatterns = [
    { 
        pattern: /InteractionFlags|InteractionResponseFlags/g, 
        description: 'References to InteractionFlags or InteractionResponseFlags' 
    },
    { 
        pattern: /flags:\s*\[[^\]]*\]/g, 
        description: 'Uses flags array syntax' 
    }
];

// Keep track of all issues
const issuesByFile = {};

// Function to check a JavaScript file
function checkFile(filePath) {
    console.log(`Checking ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    const relativeFilePath = path.relative(__dirname, filePath);
    const fileIssues = [];
    
    // Check for each pattern
    for (const { pattern, description } of issuePatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
            // Find line numbers
            let lines = [];
            const contentLines = content.split('\n');
            
            for (let i = 0; i < contentLines.length; i++) {
                if (pattern.test(contentLines[i])) {
                    lines.push(i + 1);
                }
            }
            
            fileIssues.push({
                pattern: description,
                count: matches.length,
                lines: lines
            });
        }
    }
    
    if (fileIssues.length > 0) {
        issuesByFile[relativeFilePath] = fileIssues;
    }
}

// Process index.js
const indexPath = path.join(__dirname, 'src', 'index.js');
if (fs.existsSync(indexPath)) {
    checkFile(indexPath);
}

// Process all command files
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        checkFile(filePath);
    }
}

// Generate report
console.log('\n=== ISSUES REPORT ===\n');

if (Object.keys(issuesByFile).length === 0) {
    console.log('✅ No issues found! All files look good.');
} else {
    console.log(`⚠️ Found issues in ${Object.keys(issuesByFile).length} files:`);
    
    for (const [file, issues] of Object.entries(issuesByFile)) {
        console.log(`\n📄 ${file}:`);
        for (const issue of issues) {
            console.log(`  • ${issue.pattern} (${issue.count} occurrences)`);
            console.log(`    Lines: ${issue.lines.join(', ')}`);
        }
    }
} 