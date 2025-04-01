const fs = require('fs');
const path = require('path');

// Function to fix a JavaScript file
function fixFile(filePath) {
    console.log(`Processing ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains InteractionFlags or InteractionResponseFlags
    const hasFlags = content.includes('InteractionFlags') || content.includes('InteractionResponseFlags');
    
    if (hasFlags) {
        // Remove InteractionFlags or InteractionResponseFlags from imports
        content = content.replace(/const\s*\{\s*([^}]*?),\s*(InteractionFlags|InteractionResponseFlags)\s*([^}]*?)\s*\}\s*=\s*require\(['"']discord\.js['"']\);/g, 'const { $1$3 } = require(\'discord.js\');');
        
        // Replace flags: [InteractionFlags.Ephemeral] with ephemeral: true
        content = content.replace(/flags:\s*\[\s*(InteractionFlags|InteractionResponseFlags)\.Ephemeral\s*\]/g, 'ephemeral: true');
        
        // Write the file back
        fs.writeFileSync(filePath, content);
        console.log(`Fixed ${filePath}`);
    } else {
        console.log(`No flags found in ${filePath}, skipping`);
    }
}

// Process index.js
const indexPath = path.join(__dirname, 'src', 'index.js');
if (fs.existsSync(indexPath)) {
    fixFile(indexPath);
}

// Process all command files
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        fixFile(filePath);
    }
}

console.log('All files processed successfully!'); 