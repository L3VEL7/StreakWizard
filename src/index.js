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
    console.log(`Loaded ${client.commands.size} commands:`);
    client.commands.forEach(cmd => console.log(`- ${cmd.data.name}`));

    try {
        // Register slash commands
        const commands = [];
        for (const command of client.commands.values()) {
            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        // FORCE_CLEANUP MODE: Set to true to clean up all commands first
        const FORCE_CLEANUP = false; // Changed to false to prevent constant cleanup

        // Check if we're in development mode
        const DEV_MODE = process.env.DEV_MODE === 'true';
        
        console.log(`Environment: ${DEV_MODE ? 'DEVELOPMENT' : 'PRODUCTION'}`);
        
        // First, always clear all commands everywhere
        if (FORCE_CLEANUP) {
            console.log('🧹 FORCE CLEANUP MODE: Clearing all commands everywhere...');
            
            // First clear global commands
            try {
                console.log('Clearing global commands...');
                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: [] }
                );
                console.log('✅ Global commands cleared');
            } catch (error) {
                console.error('Error clearing global commands:', error);
            }
            
            // Then clear all guild commands
            const guilds = await client.guilds.fetch();
            console.log(`Clearing commands from ${guilds.size} guilds...`);
            
            for (const [guildId, guild] of guilds) {
                try {
                    console.log(`Clearing commands from guild: ${guild.name}`);
                    await rest.put(
                        Routes.applicationGuildCommands(client.user.id, guildId),
                        { body: [] }
                    );
                    console.log(`✅ Commands cleared from guild: ${guild.name}`);
                } catch (error) {
                    console.error(`Error clearing commands from guild ${guild.name}:`, error);
                }
            }
            
            console.log('🧹 Command cleanup completed');
        }
        
        // Now register commands based on the mode
        if (DEV_MODE) {
            // In development mode, register commands per guild for faster updates
            console.log('🧪 Development mode: Registering guild-specific commands...');
            const guilds = await client.guilds.fetch();
            
            // Add a counter to avoid infinite loops and limit to max 10 guilds for safety
            let processedGuilds = 0;
            const maxGuildsToProcess = 10;
            
            // Add a timeout promise to prevent getting stuck
            const registerCommands = async () => {
                // Convert the guilds Map into an array for easier batching
                const guildArray = Array.from(guilds.values()).slice(0, maxGuildsToProcess);
                console.log(`Preparing to register commands to ${guildArray.length} guilds (max: ${maxGuildsToProcess})`);
                
                // Process guilds in smaller batches for better efficiency
                const BATCH_SIZE = 3;
                let processedGuilds = 0;
                
                for (let i = 0; i < guildArray.length; i += BATCH_SIZE) {
                    // Take a slice of guilds to process in this batch
                    const batch = guildArray.slice(i, i + BATCH_SIZE);
                    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} with ${batch.length} guilds...`);
                    
                    // Process this batch concurrently
                    const batchPromises = batch.map(async (guild) => {
                        try {
                            console.log(`[${processedGuilds + 1}/${guildArray.length}] Registering commands to guild: ${guild.name} (${guild.id})`);
                            await rest.put(
                                Routes.applicationGuildCommands(client.user.id, guild.id),
                                { body: commands }
                            );
                            console.log(`✅ Commands registered to guild: ${guild.name} (${guild.id})`);
                            return true; // Registration successful
                        } catch (error) {
                            console.error(`❌ Error registering commands to guild ${guild.name} (${guild.id}):`, error.message);
                            return false; // Registration failed
                        }
                    });
                    
                    // Wait for all guilds in this batch to be processed
                    const batchResults = await Promise.allSettled(batchPromises);
                    const successfulResults = batchResults.filter(result => 
                        result.status === 'fulfilled' && result.value === true
                    ).length;
                    
                    processedGuilds += successfulResults;
                    console.log(`Batch completed: ${successfulResults}/${batch.length} guilds successfully registered`);
                    
                    // Add a small delay between batches to avoid rate limiting
                    if (i + BATCH_SIZE < guildArray.length) {
                        console.log(`Waiting 2 seconds before next batch...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                
                return processedGuilds;
            };
            
            // Use a Promise.race with a timeout to prevent getting stuck
            try {
                const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Command registration timed out')), 120000)
                );
                
                console.log('Starting command registration with 2-minute timeout...');
                const count = await Promise.race([registerCommands(), timeout]);
                console.log(`✅ Commands registered to ${count} guilds`);
            } catch (timeoutError) {
                console.error('⚠️ Command registration timed out:', timeoutError);
                console.log('Continuing with bot startup anyway...');
            }
        } else {
            // In production mode, register commands globally
            console.log('🚀 Production mode: Registering global commands...');
            
            // Add timeout handling here too
            try {
                const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Global command registration timed out')), 60000)
                );
                
                console.log('Starting global command registration with 1-minute timeout...');
                await Promise.race([
                    rest.put(Routes.applicationCommands(client.user.id), { body: commands }),
                    timeout
                ]);
                console.log('✅ All commands registered globally');
            } catch (error) {
                if (error.message.includes('timed out')) {
                    console.error('⚠️ Global command registration timed out');
                    console.log('Continuing with bot startup anyway...');
                } else {
                    console.error('Error registering global commands:', error);
                }
            }
        }
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