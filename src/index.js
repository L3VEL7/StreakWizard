const { Client, GatewayIntentBits, Collection, PermissionFlagsBits } = require('discord.js');
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
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

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
    try {
        // Ignore messages from bots
        if (message.author.bot) return;

        // Get trigger words for this guild
        const triggerWords = await streakManager.getTriggerWords(message.guildId);
        if (!triggerWords || triggerWords.length === 0) return;

        // Check if message contains any trigger words
        const messageContent = message.content.toLowerCase();
        const matchedWord = triggerWords.find(word => messageContent.includes(word));

        if (matchedWord) {
            console.log(`Processing trigger word: ${matchedWord}`);
            const result = await streakManager.incrementStreak(message.guildId, message.author.id, matchedWord);
            
            if (result === -1) {
                const remainingTime = await streakManager.getRemainingTime(message.guildId, message.author.id, matchedWord);
                if (remainingTime) {
                    const timeMessage = remainingTime.hours > 0 
                        ? `${remainingTime.hours}h ${remainingTime.minutes}m`
                        : `${remainingTime.minutes}m`;
                    await message.reply(`⏰ Please wait ${timeMessage} before using this trigger word again.`).catch(console.error);
                }
                return;
            }

            await handleStreakUpdate(message, result, matchedWord);
        }
    } catch (error) {
        console.error('Error processing message:', error);
        // Don't throw the error, just log it
    }
});

// Helper function to handle streak updates and reactions
async function handleStreakUpdate(message, result, trigger) {
    try {
        const { count, streakStreak, milestone, streakStreakMilestone, unlockedAchievements } = result;
        
        // Convert streak number to emoji
        let streakEmoji;
        if (count <= 10) {
            const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
            streakEmoji = numberEmojis[count - 1];
        } else {
            streakEmoji = '🔥';
        }

        // Remove previous reactions
        try {
            const reactions = message.reactions.cache;
            for (const reaction of reactions.values()) {
                await reaction.remove().catch(console.error);
            }
        } catch (error) {
            console.error('Error removing previous reactions:', error);
        }

        // Add reactions
        try {
            // Always add the current streak emoji
            await message.react(streakEmoji).catch(console.error);
            
            // Add milestone emoji if achieved
            if (milestone) {
                await message.react(milestone.emoji).catch(console.error);
            }
            
            // Add streak streak milestone emoji if achieved
            if (streakStreakMilestone) {
                await message.react(streakStreakMilestone.emoji).catch(console.error);
            }

            // Add achievement emojis if unlocked
            for (const achievement of unlockedAchievements) {
                await message.react(achievement.emoji).catch(console.error);
            }
        } catch (error) {
            console.error('Error adding reactions:', error);
        }
        
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

        // Add achievement unlocks if any
        if (unlockedAchievements && unlockedAchievements.length > 0) {
            const achievementMessages = unlockedAchievements.map(a => 
                `🏆 **ACHIEVEMENT UNLOCKED!** ${a.emoji}\n${a.name} - ${a.description}`
            ).join('\n\n');
            replyMessage = `${achievementMessages}\n\n${replyMessage}`;
        }
        
        await message.reply(replyMessage).catch(console.error);
    } catch (error) {
        console.error('Error in handleStreakUpdate:', error);
        // Don't throw the error, just log it
    }
}

// Login with token
try {
    client.login(process.env.DISCORD_TOKEN);
} catch (error) {
    console.error('Failed to login:', error);
    process.exit(1);
}