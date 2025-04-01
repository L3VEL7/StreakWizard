/**
 * Streakwiz Discord Bot
 * 
 * A Discord bot for tracking and managing user streaks with advanced features:
 * 
 * Core Features:
 * - Streak tracking: Track user streaks for customizable trigger words
 * - Streak Streak: Track consecutive days users maintain their streaks
 * - Milestones: Celebrate when users reach specific streak counts
 * - Achievements: Award special achievements for various streak accomplishments
 * 
 * Enhanced Features:
 * - Raid System: Users can raid each other's streaks to steal or lose streaks
 * - Gambling: Users can gamble their streaks for a chance to win more
 * 
 * Administration:
 * - Setup-Embed: Interactive configuration panel (/setup-embed) for all features
 * - Individual commands for toggling features (/togglegambling, etc.)
 * - Customizable settings for all systems
 * 
 * PostgreSQL database for reliable data storage
 */
const { Client, GatewayIntentBits, Collection, PermissionFlagsBits } = require('discord.js');
const { config } = require('dotenv');
const path = require('path');
const fs = require('fs');
const streakManager = require('./storage/streakManager');
const { initializeDatabase } = require('./database/models');
const { REST, Routes } = require('discord.js');

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
    console.log(`Loaded ${client.commands.size} commands in memory`);
    
    // COMPLETELY SKIP REGISTRATION - This line is critical
    console.log('❗ COMMAND REGISTRATION BYPASSED - Bot will use existing commands only');
    console.log('❗ To register commands, use the manual scripts in your local environment');
    return; // This return is very important - it prevents all command registration
    
    try {
        // Code below this point will never be reached due to the return above
        // ... existing code ...
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
});

// Add this helper function before the error handling code
function truncateMessage(message, maxLength = 2000) {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
}

// Handle interactions with improved error handling
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.warn(`Command not found: ${interaction.commandName}`);
        return;
    }

    try {
        // Log command execution
        console.log(`[COMMAND] ${interaction.user.tag} (${interaction.user.id}) used /${interaction.commandName} in ${interaction.guild ? interaction.guild.name : 'DM'}`);
        
        // Check if the command requires guild context but is used in DMs
        if (command.guildOnly && !interaction.guild) {
            return await interaction.reply({
                content: '❌ This command can only be used in a server, not in DMs.',
                ephemeral: true
            });
        }
        
        // Execute the command
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        
        // Provide more specific error messages based on the error type
        let errorMessage = 'There was an error executing this command!';
        
        if (error.message && error.message.includes('permissions')) {
            errorMessage = 'There was a permissions error. Please make sure the bot has the required permissions.';
        } else if (error.message && error.message.includes('null')) {
            errorMessage = 'An error occurred accessing command data. Please try again in a server channel.';
        } else if (error.name === 'SequelizeConnectionError') {
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
                    content: truncateMessage(errorMessage),
                    ephemeral: true
                });
            } else {
        await interaction.reply({
                    content: truncateMessage(errorMessage),
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

        console.log(`[DEBUG] Processing message from ${message.author.tag} in ${message.guild?.name || 'DM'}`);
        console.log(`[DEBUG] Message content: "${message.content}"`);

        // Get trigger words for this guild
        const triggerWords = await streakManager.getTriggerWords(message.guildId);
        console.log(`[DEBUG] Trigger words for guild ${message.guildId}:`, JSON.stringify(triggerWords));
        
        if (!triggerWords || triggerWords.length === 0) {
            console.log(`[DEBUG] No trigger words found for guild ${message.guildId}`);
            return;
        }

        // Check if message contains any trigger words
        const messageContent = message.content.toLowerCase();
        console.log(`[DEBUG] Lowercase message: "${messageContent}"`);
        
        let foundMatch = false;
        // Check each trigger word individually and log the result
        for (const word of triggerWords) {
            const matches = messageContent.includes(word);
            console.log(`[DEBUG] Checking if message contains "${word}": ${matches}`);
            if (matches) foundMatch = true;
        }
        
        const matchedWord = triggerWords.find(word => messageContent.includes(word));
        console.log(`[DEBUG] Matched word: ${matchedWord || 'None'}`);

        if (matchedWord) {
            console.log(`[DEBUG] Processing trigger word: ${matchedWord}`);
            const result = await streakManager.incrementStreak(message.guildId, message.author.id, matchedWord);
            console.log(`[DEBUG] Increment result:`, JSON.stringify(result));
            
            if (result === -1) {
                console.log(`[DEBUG] Increment returned -1, checking remaining time`);
                const remainingTime = await streakManager.getRemainingTime(message.guildId, message.author.id, matchedWord);
                console.log(`[DEBUG] Remaining time:`, JSON.stringify(remainingTime));
                
                if (remainingTime) {
                    const timeMessage = remainingTime.hours > 0 
                        ? `${remainingTime.hours}h ${remainingTime.minutes}m`
                        : `${remainingTime.minutes}m`;
                    await message.reply(`⏰ Please wait ${timeMessage} before using this trigger word again.`).catch(console.error);
                }
                return;
            }

            await handleStreakUpdate(message, result, matchedWord);
        } else {
            console.log(`[DEBUG] No trigger words matched in this message`);
        }
    } catch (error) {
        console.error('Error processing message:', error);
        // Don't throw the error, just log it
    }
});

// Helper function to handle streak updates and reactions
async function handleStreakUpdate(message, result, trigger) {
    try {
        const { count, streakStreak, milestone, streakStreakMilestone, unlockedAchievements = [] } = result;

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