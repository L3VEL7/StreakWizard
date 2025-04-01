const fs = require('fs');
const path = require('path');

// Files with issues that need fixing
const filesToFix = [
    'src/commands/gamble.js',
    'src/commands/raid.js',
    'src/commands/refresh.js',
    'src/commands/reload.js',
    'src/commands/remove.js',
    'src/commands/reset.js',
    'src/commands/setstreak_limit.js',
    'src/commands/setup-embed.js',
    'src/commands/setup.js',
    'src/commands/toggle_streakstreak.js'
];

// Function to add ephemeral: true to interaction methods
function addEphemeralToFile(filePath) {
    console.log(`Processing ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Find all lines with interaction.reply, interaction.editReply, etc.
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for reply, editReply, deferReply, followUp
        if (line.includes('interaction.') && 
            (line.includes('.reply') || 
             line.includes('.editReply') || 
             line.includes('.deferReply') || 
             line.includes('.followUp'))) {
                
            // If the line has { but doesn't have ephemeral
            if (line.includes('{') && !line.includes('ephemeral')) {
                // Look for closing }
                if (line.includes('})')) {
                    // Single-line reply - add ephemeral: true before closing }
                    lines[i] = line.replace('})','}, ephemeral: true })');
                    modified = true;
                } else {
                    // Multi-line reply - need to find the closing }
                    let j = i + 1;
                    while (j < lines.length && !lines[j].includes('})')) {
                        j++;
                    }
                    
                    if (j < lines.length && !lines.slice(i, j + 1).join('\n').includes('ephemeral')) {
                        // Found the closing line, add ephemeral: true before closing }
                        lines[j] = lines[j].replace('})','}, ephemeral: true })');
                        modified = true;
                    }
                }
            }
            
            // Handle cases with empty deferReply()
            if (line.includes('.deferReply()')) {
                lines[i] = line.replace('.deferReply()', '.deferReply({ ephemeral: true })');
                modified = true;
            }
        }
    }
    
    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`Fixed ${filePath}`);
    } else {
        console.log(`No changes needed for ${filePath}`);
    }
    
    return modified;
}

// Process each file in the list
let fixedCount = 0;
for (const fileName of filesToFix) {
    const filePath = path.join(__dirname, fileName);
    if (fs.existsSync(filePath)) {
        const wasFixed = addEphemeralToFile(filePath);
        if (wasFixed) fixedCount++;
    } else {
        console.log(`File not found: ${filePath}`);
    }
}

console.log(`\nFixed ${fixedCount} files out of ${filesToFix.length}`);

// Run the check again to verify
console.log('\nRunning check to verify fixes...');
const checkScript = path.join(__dirname, 'check-issues.js');
if (fs.existsSync(checkScript)) {
    require(checkScript);
} 