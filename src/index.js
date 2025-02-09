const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { config } = require('dotenv');
const path = require('path');
const fs = require('fs');
const streakManager = require('./storage/streakManager');
const { initializeDatabase } = require('./database/models');

// Load environment variables
config();

// Validate environment variables
if (!process.env.DISCORD_TOKEN) {
    console.error('Missing DISCORD_TOKEN environment variable');
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL environment variable');
    process.exit(1);
}

// Initialize database
initializeDatabase().catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});

// Create Discord client instance with minimal required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        // Validate command structure
        if (!command.data || !command.data.name || !command.execute) {
            console.warn(`[WARNING] The command at ${file} is missing required properties. Skipping.`);
            continue;
        }

        // Set command
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
    } catch (error) {
        console.error(`[ERROR] Failed to load command ${file}:`, error);
    }
}

// Handle ready event
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        // Register slash commands
        const commands = [];
        for (const command of client.commands.values()) {
            commands.push(command.data.toJSON());
        }

        await client.application.commands.set(commands);
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error('Error registering application commands:', error);
    }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'There was an error executing this command!',
            ephemeral: true
        });
    }
});

// Handle message events for streak tracking
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const triggers = await streakManager.getTriggerWords(message.guildId);
    if (!triggers || triggers.length === 0) return;

    const content = message.content.toLowerCase().trim();
    console.log(`Message content: "${content}"`); // Debug log
    for (const trigger of triggers) {
        const processedTrigger = trigger.toLowerCase().trim();
        console.log(`Comparing with trigger: "${processedTrigger}"`); // Debug log
        // Ensure exact match by trimming and comparing lowercase versions
        if (content === processedTrigger) {
            const newStreak = await streakManager.incrementStreak(message.guildId, message.author.id, trigger);
            try {
                if (newStreak === -1) {
                    // Rate limited
                    const limit = await streakManager.getStreakLimit(message.guildId);
                    const timeUnit = limit >= 1440 ? 'day' : 'hour';
                    const timeValue = limit >= 1440 ? limit / 1440 : limit / 60;
                    await message.reply(`⏳ Please wait ${timeValue} ${timeUnit}${timeValue !== 1 ? 's' : ''} between streak updates.`);
                    break;
                }

                // Convert streak number to emoji
                let streakEmoji;
                if (newStreak <= 10) {
                    // Use number emojis for streaks 1-10
                    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                    streakEmoji = numberEmojis[newStreak - 1];
                } else {
                    // Use fire emoji for streaks above 10
                    streakEmoji = '🔥';
                }

                await message.react(streakEmoji);
                // Optional: Send feedback about the streak
                await message.reply(`${streakEmoji} Your streak for "${trigger}" is now ${newStreak}!`);
            } catch (error) {
                console.error('Error reacting to message:', error);
            }
            break; // Exit loop after finding matching trigger
        }
    }
});

// Login with token
try {
    client.login(process.env.DISCORD_TOKEN);
} catch (error) {
    console.error('Failed to login:', error);
    process.exit(1);
}