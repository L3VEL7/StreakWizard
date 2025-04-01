const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove InteractionFlags and InteractionResponseFlags from imports
    content = content.replace(/const \{([^}]*), (InteractionFlags|InteractionResponseFlags)\} = require\('discord\.js'\)/, 'const {$1} = require(\'discord.js\')');

    // Replace all instances of flags: [InteractionFlags.Ephemeral] or flags: [InteractionResponseFlags.Ephemeral] with ephemeral: true
    content = content.replace(/flags: \[(InteractionFlags|InteractionResponseFlags)\.Ephemeral\]/g, 'ephemeral: true');

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
} 