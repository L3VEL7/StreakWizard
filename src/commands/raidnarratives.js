const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Helper function to get the correct path to raidMessages.js
function getRaidMessagesPath() {
    // Try to find the file in potential locations
    const possiblePaths = [
        path.join(__dirname, '..', 'data', 'raidMessages.js'),
        path.join(process.cwd(), 'src', 'data', 'raidMessages.js'),
    ];

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }

    // If we can't find the file, return a default path
    return path.join(__dirname, '..', 'data', 'raidMessages.js');
}

// Keep in-memory backups of messages in case file operations fail
let cachedSuccessMessages = [];
let cachedFailureMessages = [];

/**
 * Load raid messages from raidMessages.js
 * @returns {Object} Object containing success and failure messages
 */
function loadRaidMessages() {
    try {
        // Clear the require cache to ensure we get the latest version
        const messagesPath = getRaidMessagesPath();
        delete require.cache[require.resolve(messagesPath)];
        
        // Load the messages
        const raidMessages = require(messagesPath);
        
        // Update cached messages
        cachedSuccessMessages = [...raidMessages.successMessages];
        cachedFailureMessages = [...raidMessages.failureMessages];
        
        return raidMessages;
    } catch (error) {
        console.error('Error loading raid messages:', error);
        
        // Return cached messages if available, otherwise empty arrays
        return {
            successMessages: cachedSuccessMessages.length > 0 ? cachedSuccessMessages : [],
            failureMessages: cachedFailureMessages.length > 0 ? cachedFailureMessages : []
        };
    }
}

/**
 * Save raid messages to the file
 * @param {Array} successMessages - Array of success messages
 * @param {Array} failureMessages - Array of failure messages
 * @returns {boolean} Whether the save was successful
 */
function saveRaidMessages(successMessages, failureMessages) {
    try {
        const messagesPath = getRaidMessagesPath();
        
        // Create content for the file
        const fileContent = `/**
 * Raid Narratives for Streakwiz Bot
 * 
 * This file contains narrative templates for successful and failed raids.
 * Admins can add, modify, or remove narratives without changing the bot code.
 * 
 * Available variables:
 * - {{attacker}} - The user who initiated the raid
 * - {{defender}} - The user who was raided
 * - {{amount}} - The amount of streaks stolen/lost
 * - {{word}} - The trigger word being raided
 * 
 * Each message should tell a short story while conveying what happened in the raid.
 */

// Define backup narratives in case loading fails
const DEFAULT_SUCCESS_MESSAGES = [
    "{{attacker}} sneakily infiltrated {{defender}}'s treasure vault, making off with {{amount}} precious {{word}} streaks!",
    "{{attacker}} gracefully maneuvered through {{defender}}'s kitchen, lifting {{amount}} {{word}} streaks when the porridge was at its warmest!"
];

const DEFAULT_FAILURE_MESSAGES = [
    "{{attacker}} tripped on a loose floorboard, alerting {{defender}} who confiscated {{amount}} {{word}} streaks as penalty!",
    "The alarm was triggered! {{defender}} caught {{attacker}} red-handed and claimed {{amount}} {{word}} streaks as compensation!"
];

// Define main arrays of success and failure messages
const successMessages = ${JSON.stringify(successMessages, null, 4)};

const failureMessages = ${JSON.stringify(failureMessages, null, 4)};

// Handle module export with error catching
try {
    module.exports = {
        successMessages: successMessages || DEFAULT_SUCCESS_MESSAGES,
        failureMessages: failureMessages || DEFAULT_FAILURE_MESSAGES,
        
        /**
         * Gets a random narrative message from the appropriate list
         * @param {boolean} success - Whether the raid was successful
         * @returns {string} A random narrative message
         */
        getRandomMessage(success) {
            try {
                const messages = success ? 
                    (successMessages || DEFAULT_SUCCESS_MESSAGES) : 
                    (failureMessages || DEFAULT_FAILURE_MESSAGES);
                
                if (!messages || !Array.isArray(messages) || messages.length === 0) {
                    throw new Error('No valid messages found');
                }
                
                const randomIndex = Math.floor(Math.random() * messages.length);
                return messages[randomIndex];
            } catch (error) {
                console.error('Error getting random message:', error);
                // Return a safe default
                return success ? 
                    "{{attacker}} stole {{amount}} {{word}} streaks from {{defender}}!" :
                    "{{attacker}} failed and lost {{amount}} {{word}} streaks to {{defender}}!";
            }
        },
        
        /**
         * Formats a narrative message by replacing placeholders with actual values
         * @param {string} message - The narrative message template
         * @param {object} data - Object containing values to insert
         * @returns {string} The formatted message
         */
        formatMessage(message, data) {
            try {
                if (!message || typeof message !== 'string') {
                    throw new Error('Invalid message template');
                }
                
                let formatted = message;
                for (const [key, value] of Object.entries(data || {})) {
                    if (value !== undefined && value !== null) {
                        formatted = formatted.replace(new RegExp(\`{{${key}}}\`, 'g'), value);
                    }
                }
                
                // Check if any placeholders remain
                if (formatted.includes('{{') && formatted.includes('}}')) {
                    console.warn('Unresolved placeholders in formatted message:', formatted);
                }
                
                return formatted;
            } catch (error) {
                console.error('Error formatting message:', error);
                // Return a safe default with the data we have
                return \`${data?.attacker || 'Someone'} ${data?.success ? 'stole' : 'lost'} ${data?.amount || 'some'} streaks.\`;
            }
        },
        
        /**
         * Validates if a message has all required placeholders
         * @param {string} message - The message template to validate
         * @returns {boolean} True if all required placeholders are present
         */
        validateMessage(message) {
            try {
                if (!message || typeof message !== 'string') {
                    return false;
                }
                
                const requiredPlaceholders = ['{{attacker}}', '{{defender}}', '{{amount}}', '{{word}}'];
                return requiredPlaceholders.every(placeholder => message.includes(placeholder));
            } catch (error) {
                console.error('Error validating message:', error);
                return false;
            }
        }
    };
} catch (error) {
    console.error('Error exporting raid messages module:', error);
    // Provide a minimal fallback export
    module.exports = {
        successMessages: DEFAULT_SUCCESS_MESSAGES,
        failureMessages: DEFAULT_FAILURE_MESSAGES,
        getRandomMessage: (success) => success ? DEFAULT_SUCCESS_MESSAGES[0] : DEFAULT_FAILURE_MESSAGES[0],
        formatMessage: (message, data) => message.replace(/{{(\\w+)}}/g, (_, key) => data[key] || ''),
        validateMessage: () => true // Always return true in fallback mode to avoid blocking functionality
    };
}`;

        // Write to file
        fs.writeFileSync(messagesPath, fileContent, 'utf8');
        
        // Update cached messages
        cachedSuccessMessages = [...successMessages];
        cachedFailureMessages = [...failureMessages];
        
        return true;
    } catch (error) {
        console.error('Error saving raid messages:', error);
        return false;
    }
}

/**
 * Validate if a narrative contains all required placeholders
 * @param {string} narrative - The narrative to validate
 * @returns {boolean} Whether the narrative is valid
 */
function validateNarrative(narrative) {
    try {
        // Check if the narrative has all required placeholders
        const raidMessages = loadRaidMessages();
        return raidMessages.validateMessage(narrative);
    } catch (error) {
        console.error('Error validating narrative:', error);
        
        // Fallback validation if the module function fails
        const requiredPlaceholders = ['{{attacker}}', '{{defender}}', '{{amount}}', '{{word}}'];
        return requiredPlaceholders.every(placeholder => narrative.includes(placeholder));
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raidnarratives')
        .setDescription('Manage raid narrative messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand => 
            subcommand
                .setName('list')
                .setDescription('List all raid narratives')
                .addStringOption(option => 
                    option
                        .setName('type')
                        .setDescription('Type of narratives to list')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Success', value: 'success' },
                            { name: 'Failure', value: 'failure' },
                            { name: 'All', value: 'all' }
                        )
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('add')
                .setDescription('Add a new raid narrative')
                .addStringOption(option => 
                    option
                        .setName('type')
                        .setDescription('Type of narrative to add')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Success', value: 'success' },
                            { name: 'Failure', value: 'failure' }
                        )
                )
                .addStringOption(option => 
                    option
                        .setName('narrative')
                        .setDescription('The narrative text with placeholders {{attacker}}, {{defender}}, {{amount}}, {{word}}')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('delete')
                .setDescription('Delete a raid narrative')
                .addStringOption(option => 
                    option
                        .setName('type')
                        .setDescription('Type of narrative to delete')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Success', value: 'success' },
                            { name: 'Failure', value: 'failure' }
                        )
                )
                .addIntegerOption(option => 
                    option
                        .setName('index')
                        .setDescription('Index of the narrative to delete (starting from 1)')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('reload')
                .setDescription('Reload raid narratives from the file')
        ),

    async execute(interaction) {
        // Check if the user has administrator permissions
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: 'You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            const raidMessages = loadRaidMessages();
            
            if (subcommand === 'list') {
                const type = interaction.options.getString('type');
                
                // Create embed for listing narratives
                const embed = new EmbedBuilder()
                    .setTitle('Raid Narratives')
                    .setColor('#0099ff')
                    .setFooter({ text: 'Use /raidnarratives add or /raidnarratives delete to manage narratives' });
                
                if (type === 'success' || type === 'all') {
                    const successList = raidMessages.successMessages.map((msg, index) => 
                        `${index + 1}. ${msg}`
                    ).join('\n\n');
                    
                    if (successList.length > 0) {
                        // If the success list is too long, split it into multiple fields
                        if (successList.length > 1024) {
                            const chunks = successList.match(/.{1,1024}(?=\s|$)/g) || [];
                            for (let i = 0; i < chunks.length; i++) {
                                embed.addFields({ 
                                    name: i === 0 ? 'Success Narratives' : 'Success Narratives (continued)', 
                                    value: chunks[i] 
                                });
                            }
                        } else {
                            embed.addFields({ name: 'Success Narratives', value: successList });
                        }
                    } else {
                        embed.addFields({ name: 'Success Narratives', value: 'No success narratives found.' });
                    }
                }
                
                if (type === 'failure' || type === 'all') {
                    const failureList = raidMessages.failureMessages.map((msg, index) => 
                        `${index + 1}. ${msg}`
                    ).join('\n\n');
                    
                    if (failureList.length > 0) {
                        // If the failure list is too long, split it into multiple fields
                        if (failureList.length > 1024) {
                            const chunks = failureList.match(/.{1,1024}(?=\s|$)/g) || [];
                            for (let i = 0; i < chunks.length; i++) {
                                embed.addFields({ 
                                    name: i === 0 ? 'Failure Narratives' : 'Failure Narratives (continued)', 
                                    value: chunks[i] 
                                });
                            }
                        } else {
                            embed.addFields({ name: 'Failure Narratives', value: failureList });
                        }
                    } else {
                        embed.addFields({ name: 'Failure Narratives', value: 'No failure narratives found.' });
                    }
                }
                
                // Send the embed
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } 
            else if (subcommand === 'add') {
                const type = interaction.options.getString('type');
                const narrative = interaction.options.getString('narrative');
                
                // Validate the narrative
                if (!validateNarrative(narrative)) {
                    return interaction.reply({
                        content: 'Invalid narrative! Please make sure it includes all required placeholders: {{attacker}}, {{defender}}, {{amount}}, {{word}}',
                        ephemeral: true
                    });
                }
                
                // Add the narrative to the appropriate list
                if (type === 'success') {
                    raidMessages.successMessages.push(narrative);
                } else if (type === 'failure') {
                    raidMessages.failureMessages.push(narrative);
                }
                
                // Save the updated messages
                const saved = saveRaidMessages(raidMessages.successMessages, raidMessages.failureMessages);
                
                // Reply based on save result
                if (saved) {
                    return interaction.reply({
                        content: `Successfully added a new ${type} narrative!`,
                        ephemeral: true
                    });
                } else {
                    // Even if file save failed, we've updated the in-memory cache
                    return interaction.reply({
                        content: `Added the narrative to memory, but encountered an error saving to file. The narrative will be available until the bot restarts.`,
                        ephemeral: true
                    });
                }
            } 
            else if (subcommand === 'delete') {
                const type = interaction.options.getString('type');
                const index = interaction.options.getInteger('index') - 1; // Convert to 0-based
                
                // Get the appropriate list
                const messagesList = type === 'success' ? 
                    raidMessages.successMessages : 
                    raidMessages.failureMessages;
                
                // Check if the index is valid
                if (index < 0 || index >= messagesList.length) {
                    return interaction.reply({
                        content: `Invalid index! There are only ${messagesList.length} ${type} narratives.`,
                        ephemeral: true
                    });
                }
                
                // Store the narrative for the reply message
                const deletedNarrative = messagesList[index];
                
                // Remove the narrative
                if (type === 'success') {
                    raidMessages.successMessages.splice(index, 1);
                } else if (type === 'failure') {
                    raidMessages.failureMessages.splice(index, 1);
                }
                
                // Save the updated messages
                const saved = saveRaidMessages(raidMessages.successMessages, raidMessages.failureMessages);
                
                // Reply based on save result
                if (saved) {
                    return interaction.reply({
                        content: `Successfully deleted the ${type} narrative: "${deletedNarrative}"`,
                        ephemeral: true
                    });
                } else {
                    // Even if file save failed, we've updated the in-memory cache
                    return interaction.reply({
                        content: `Deleted the narrative from memory, but encountered an error saving to file. The change will be effective until the bot restarts.`,
                        ephemeral: true
                    });
                }
            } 
            else if (subcommand === 'reload') {
                // Reload messages from file
                const reloadedMessages = loadRaidMessages();
                
                // Reply with the result
                return interaction.reply({
                    content: `Successfully reloaded raid narratives! Found ${reloadedMessages.successMessages.length} success narratives and ${reloadedMessages.failureMessages.length} failure narratives.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error executing raidnarratives command:', error);
            
            return interaction.reply({
                content: 'An error occurred while executing the command. Please check the bot logs for details.',
                ephemeral: true
            });
        }
    },
}; 