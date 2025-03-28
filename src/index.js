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

// Handle process exit
process.on('exit', (code) => {
    if (code === 2) {
        console.log('Bot restart initiated...');
        // The process manager (like PM2) will handle the actual restart
    } else {
        console.log(`Bot shutting down with exit code ${code}`);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process, let it continue running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, let it continue running
});

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
    console.log('=== Command Registration ===');
    console.log(`Loaded ${client.commands.size} commands:`);
    client.commands.forEach(cmd => console.log(`- ${cmd.data.name}`));

    try {
        // First, delete all existing commands
        const existingCommands = await client.application.commands.fetch();
        console.log(`Found ${existingCommands.size} existing commands`);
        
        for (const command of existingCommands.values()) {
            await command.delete();
            console.log(`Deleted command: ${command.name}`);
        }

        // Register slash commands
        const commands = [];
        for (const command of client.commands.values()) {
            commands.push(command.data.toJSON());
        }

        // Register commands globally
        await client.application.commands.set(commands);
        console.log('Successfully registered application commands globally.');
    } catch (error) {
        console.error('Error registering application commands:', error);
        // Attempt to register commands per guild as fallback
        try {
            const guilds = await client.guilds.fetch();
            console.log(`Attempting to register commands in ${guilds.size} guilds...`);
            for (const [guildId, guild] of guilds) {
                try {
                    // Delete existing commands in the guild
                    const existingGuildCommands = await guild.commands.fetch();
                    for (const command of existingGuildCommands.values()) {
                        await command.delete();
                    }
                    
                    // Register new commands
                    await guild.commands.set(commands);
                    console.log(`Successfully registered commands for guild: ${guild.name}`);
                } catch (guildError) {
                    console.error(`Failed to register commands for guild ${guild.name}:`, guildError);
                }
            }
        } catch (fallbackError) {
            console.error('Failed to register commands per guild:', fallbackError);
        }
    }
});

// Handle interactions with improved error handling
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.warn(`Command not found: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        
        // Provide more specific error messages based on the error type
        let errorMessage = 'There was an error executing this command!';
        if (error.name === 'SequelizeConnectionError') {
            errorMessage = 'Database connection error. Please try again later.';
        } else if (error.name === 'SequelizeValidationError') {
            errorMessage = 'Invalid data provided. Please check your input.';
        } else if (error.code === 50001) {
            errorMessage = 'I don\'t have permission to perform this action.';
        } else if (error.code === 50013) {
            errorMessage = 'You don\'t have permission to use this command.';
        }

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
    }
});

// Handle message events with improved error handling and rate limiting
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    try {
        const triggers = await streakManager.getTriggerWords(message.guildId);
        if (!triggers || triggers.length === 0) return;

        const content = message.content.toLowerCase().trim();
        
        // Use Promise.race to implement a timeout for trigger processing
        const triggerPromise = (async () => {
            for (const trigger of triggers) {
                const processedTrigger = trigger.toLowerCase().trim();
                if (content === processedTrigger) {
                    const result = await streakManager.incrementStreak(message.guildId, message.author.id, trigger);
                    
                    if (result === -1) {
                        // Rate limited
                        const remainingTime = await streakManager.getRemainingTime(message.guildId, message.author.id, trigger);
                        if (remainingTime === 0) {
                            // If they can update now, try incrementing again
                            const retryResult = await streakManager.incrementStreak(message.guildId, message.author.id, trigger);
                            if (retryResult !== -1) {
                                await handleStreakUpdate(message, retryResult, trigger);
                            }
                        } else {
                            let timeMessage = '⏳ Please wait ';
                            if (remainingTime.hours > 0) {
                                timeMessage += `${remainingTime.hours} hour${remainingTime.hours !== 1 ? 's' : ''} `;
                            }
                            if (remainingTime.minutes > 0) {
                                timeMessage += `${remainingTime.minutes} minute${remainingTime.minutes !== 1 ? 's' : ''}`;
                            }
                            timeMessage += ' until your next streak update.';
                            await message.reply(timeMessage);
                        }
                        return;
                    }

                    await handleStreakUpdate(message, result, trigger);
                    return;
                }
            }
        })();

        // Set a timeout of 5 seconds for trigger processing
        await Promise.race([
            triggerPromise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Trigger processing timeout')), 5000)
            )
        ]);
    } catch (error) {
        console.error('Error processing message:', error);
        if (error.message === 'Trigger processing timeout') {
            console.warn('Trigger processing took too long, skipping');
        } else {
            try {
                await message.reply('Sorry, there was an error processing your message. Please try again later.');
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    }
});

// Helper function to handle streak updates and reactions
async function handleStreakUpdate(message, result, trigger) {
    const { count, streakStreak, milestone, streakStreakMilestone } = result;
    
    // Convert streak number to emoji
    let streakEmoji;
    if (count <= 10) {
        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        streakEmoji = numberEmojis[count - 1];
    } else {
        streakEmoji = '🔥';
    }

    await message.react(streakEmoji);
    
    let replyMessage = `${streakEmoji} Your streak for "${trigger}" is now ${count}!`;
    
    // Add streak streak information only if enabled
    if (await streakManager.isStreakStreakEnabled(message.guildId)) {
        if (streakStreak > 1) {
            replyMessage += `\n📅 You've maintained this streak for ${streakStreak} days in a row!`;
        }
        
        // Add streak streak milestone celebration if achieved
        if (streakStreakMilestone) {
            replyMessage = `🎉 **STREAK STREAK MILESTONE!** 🎉\n${streakStreakMilestone.emoji} Amazing job ${message.author}! You've maintained your streak for ${streakStreakMilestone.level} days in a row!\n${replyMessage}`;
        }
    }
    
    // Add milestone celebration if achieved
    if (milestone) {
        replyMessage = `🎉 **MILESTONE ACHIEVED!** 🎉\n${milestone.emoji} Congratulations ${message.author}! You've reached ${milestone.level} streaks for "${trigger}"!\n${replyMessage}`;
    }
    
    await message.reply(replyMessage);
}

// Login with token
try {
    client.login(process.env.DISCORD_TOKEN);
} catch (error) {
    console.error('Failed to login:', error);
    process.exit(1);
}