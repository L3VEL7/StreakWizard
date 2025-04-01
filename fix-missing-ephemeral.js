const fs = require('fs');
const path = require('path');

// Function to fix a JavaScript file
function fixFile(filePath) {
    console.log(`Processing ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix reply() without ephemeral
    const replyRegex = /(\s*await\s+interaction\.reply\s*\(\s*{[^}]*?)(\}\s*\))/g;
    content = content.replace(replyRegex, (match, before, after) => {
        if (!match.includes('ephemeral')) {
            modified = true;
            return `${before}, ephemeral: true${after}`;
        }
        return match;
    });
    
    // Fix editReply() without ephemeral
    const editReplyRegex = /(\s*await\s+interaction\.editReply\s*\(\s*{[^}]*?)(\}\s*\))/g;
    content = content.replace(editReplyRegex, (match, before, after) => {
        if (!match.includes('ephemeral')) {
            modified = true;
            return `${before}, ephemeral: true${after}`;
        }
        return match;
    });
    
    // Fix deferReply() without ephemeral
    const deferReplyRegex = /(\s*await\s+interaction\.deferReply\s*\(\s*{[^}]*?)(\}\s*\))/g;
    content = content.replace(deferReplyRegex, (match, before, after) => {
        if (!match.includes('ephemeral')) {
            modified = true;
            return `${before}, ephemeral: true${after}`;
        }
        return match;
    });
    
    // Fix deferReply() with empty options
    const emptyDeferReplyRegex = /(\s*await\s+interaction\.deferReply\s*\(\s*)\)/g;
    content = content.replace(emptyDeferReplyRegex, (match, before) => {
        modified = true;
        return `${before}{ ephemeral: true })`;
    });
    
    // Fix followUp() without ephemeral
    const followUpRegex = /(\s*await\s+interaction\.followUp\s*\(\s*{[^}]*?)(\}\s*\))/g;
    content = content.replace(followUpRegex, (match, before, after) => {
        if (!match.includes('ephemeral')) {
            modified = true;
            return `${before}, ephemeral: true${after}`;
        }
        return match;
    });
    
    // Fix empty interaction objects
    const emptyObjectRegex = /(\s*await\s+interaction\.(reply|editReply|followUp)\s*\(\s*{\s*)\}/g;
    content = content.replace(emptyObjectRegex, (match, before) => {
        modified = true;
        return `${before}ephemeral: true }`;
    });
    
    // Only write if changes were made
    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed ${filePath}`);
    } else {
        console.log(`No changes needed for ${filePath}`);
    }
}

// Process command files
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        fixFile(filePath);
    }
}

// Process index.js
const indexPath = path.join(__dirname, 'src', 'index.js');
if (fs.existsSync(indexPath)) {
    fixFile(indexPath);
}

console.log('All files processed successfully!'); 