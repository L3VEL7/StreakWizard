const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const streakManager = require('../storage/streakManager');

/**
 * Setup-Embed Command
 * 
 * An interactive configuration panel for server administrators to configure
 * all bot features through a visual menu system with dropdowns and buttons.
 * 
 * Features include:
 * - Core feature configuration (trigger words, streak limits, streak streak)
 * - Raid system configuration (toggle, steal %, risk %, success chance, cooldown)
 * - Gambling system configuration (toggle, win chance, max %, min streaks)
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-embed')
        .setDescription('Open the interactive configuration panel for all bot features')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get current configurations
            const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
            const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
            const streakStreakEnabled = await streakManager.isStreakStreakEnabled(interaction.guildId);
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            const streakLimit = await streakManager.getStreakLimit(interaction.guildId);

            // Create the main embed with current configuration summary
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('⚙️ Server Configuration')
                .setDescription('Select a feature to configure from the dropdown menu below.')
                .addFields(
                    { name: '🎯 Core Features', value: `Trigger Words: ${triggerWords.join(', ') || 'None'}\nStreak Limit: ${streakLimit || 'None'}\nStreak Streak: ${streakStreakEnabled ? '✅ Enabled' : '❌ Disabled'}` },
                    { name: '⚔️ Raid System', value: `Status: ${raidConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\nMax Steal: ${raidConfig.maxStealPercent}%\nRisk: ${raidConfig.riskPercent}%\nSuccess Chance: ${raidConfig.successChance}%\nCooldown: ${raidConfig.cooldownHours}h` },
                    { name: '🎲 Gambling System', value: `Status: ${gamblingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\nSuccess Chance: ${gamblingConfig.successChance}%\nMax Gamble: ${gamblingConfig.maxGamblePercent}%\nMin Streaks: ${gamblingConfig.minStreaks}` }
                );

            // Create the main feature selection dropdown menu
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('config_select')
                        .setPlaceholder('Select a feature to configure')
                        .addOptions([
                            {
                                label: 'Core Features',
                                description: 'Configure trigger words and basic settings',
                                value: 'core',
                                emoji: '🎯'
                            },
                            {
                                label: 'Raid System',
                                description: 'Configure raid settings and parameters',
                                value: 'raid',
                                emoji: '⚔️'
                            },
                            {
                                label: 'Gambling System',
                                description: 'Configure gambling settings and odds',
                                value: 'gambling',
                                emoji: '🎲'
                            }
                        ])
                );

            const message = await interaction.editReply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            // Create a collector for all menu interactions with 5 minute timeout
            const collector = message.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                // Verify that only the command user can interact with the menus
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({
                        content: '❌ Only the command user can use this menu.'
                    });
                }

                try {
                    // Handle all possible interaction types
                    
                    // 1. Main menu selections
                    if (i.customId === 'config_select') {
                        switch (i.values[0]) {
                            case 'core':
                                await handleCoreConfig(i, interaction);
                                break;
                            case 'raid':
                                await handleRaidConfig(i, interaction);
                                break;
                            case 'gambling':
                                await handleGamblingConfig(i, interaction);
                                break;
                        }
                    }
                    // 2. Back button to main menu
                    else if (i.customId === 'back_to_main') {
                        // Don't call execute again - rebuild the main menu instead
                        await showMainMenu(i, interaction.guildId);
                    }
                    // 3. Gambling system configuration options
                    else if (i.customId === 'gambling_select') {
                        switch (i.values[0]) {
                            case 'toggle_gambling':
                                await handleToggleGambling(i, interaction);
                                break;
                            case 'success_chance':
                                await handleGamblingSuccessChance(i, interaction);
                                break;
                            case 'max_gamble':
                                await handleGamblingMaxPercent(i, interaction);
                                break;
                            case 'min_streaks':
                                await handleGamblingMinStreaks(i, interaction);
                                break;
                        }
                    }
                    // 4. Raid system configuration options
                    else if (i.customId === 'raid_select') {
                        switch (i.values[0]) {
                            case 'toggle_raid':
                                await handleToggleRaid(i, interaction);
                                break;
                            case 'max_steal':
                                await handleRaidMaxSteal(i, interaction);
                                break;
                            case 'risk':
                                await handleRaidRisk(i, interaction);
                                break;
                            case 'success_chance':
                                await handleRaidSuccessChance(i, interaction);
                                break;
                            case 'cooldown':
                                await handleRaidCooldown(i, interaction);
                                break;
                        }
                    }
                    // 5. Core features configuration options
                    else if (i.customId === 'core_select') {
                        switch (i.values[0]) {
                            case 'trigger_words':
                                await handleTriggerWords(i, interaction);
                                break;
                            case 'streak_limit':
                                await handleStreakLimit(i, interaction);
                                break;
                            case 'streak_streak':
                                await handleStreakStreak(i, interaction);
                                break;
                        }
                    }
                } catch (error) {
                    console.error('Error handling configuration:', error);
                    await i.update({
                        content: '❌ An error occurred while processing your selection.'
                    });
                }
            });

            // Handle timeout of the configuration panel
            collector.on('end', async () => {
                await interaction.editReply({
                    content: '⏰ Configuration panel timed out. Use /setup-embed to open a new panel.',
                    components: [],
                    ephemeral: true
                });
            });
        } catch (error) {
            console.error('Error creating setup panel:', error);
            await interaction.editReply({
                content: '❌ An error occurred while creating the configuration panel.',
                ephemeral: true
            });
        }
    },
};

/**
 * Handle Core Features Configuration
 * Displays and processes core bot features like trigger words, 
 * streak limits, and streak streak tracking.
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleCoreConfig(interaction, originalInteraction) {
    const streakStreakEnabled = await streakManager.isStreakStreakEnabled(interaction.guildId);
    const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
    const streakLimit = await streakManager.getStreakLimit(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎯 Core Features Configuration')
        .setDescription('Select an option to configure:')
        .addFields(
            { name: 'Trigger Words', value: `Current: ${triggerWords.join(', ') || 'None'}` },
            { name: 'Streak Limit', value: `Current: ${streakLimit || 'None'}` },
            { name: 'Streak Streak', value: `Current: ${streakStreakEnabled ? '✅ Enabled' : '❌ Disabled'}` }
        );

    const selectRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('core_select')
                .setPlaceholder('Select an option')
                .addOptions([
                    {
                        label: 'Trigger Words',
                        description: 'Manage trigger words',
                        value: 'trigger_words',
                        emoji: '📝'
                    },
                    {
                        label: 'Streak Limit',
                        description: 'Set streak update interval',
                        value: 'streak_limit',
                        emoji: '⏰'
                    },
                    {
                        label: `Streak Streak ${streakStreakEnabled ? '✅' : '❌'}`,
                        description: 'Toggle streak streak feature',
                        value: 'streak_streak',
                        emoji: '📅'
                    }
                ])
        );
    
    const backButton = createBackButton();

    await interaction.update({
        embeds: [embed],
        components: [selectRow, backButton],
        ephemeral: true
    });
}

/**
 * Handle Raid System Configuration
 * Displays and processes raid system settings like enabling/disabling,
 * steal percentages, risk, success chance, and cooldown periods.
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidConfig(interaction, originalInteraction) {
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    
    // Ensure default values
    const config = {
        enabled: raidConfig.enabled || false,
        maxStealPercent: raidConfig.maxStealPercent || 20,
        riskPercent: raidConfig.riskPercent || 30,
        successChance: raidConfig.successChance || 40,
        cooldownHours: raidConfig.cooldownHours || 24
    };
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚔️ Raid System Configuration')
        .setDescription('Select a setting to configure:')
        .addFields(
            { name: 'Enable/Disable', value: `Current: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}` },
            { name: 'Max Steal', value: `Current: ${config.maxStealPercent}%` },
            { name: 'Risk', value: `Current: ${config.riskPercent}%` },
            { name: 'Success Chance', value: `Current: ${config.successChance}%` },
            { name: 'Cooldown', value: `Current: ${config.cooldownHours}h` }
        );

    const selectRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('raid_select')
                .setPlaceholder('Select a setting')
                .addOptions([
                    {
                        label: `Enable/Disable ${config.enabled ? '✅' : '❌'}`,
                        description: 'Toggle raid system',
                        value: 'toggle_raid',
                        emoji: '🔒'
                    },
                    {
                        label: 'Max Steal',
                        description: 'Set maximum steal percentage',
                        value: 'max_steal',
                        emoji: '💰'
                    },
                    {
                        label: 'Risk',
                        description: 'Set risk percentage',
                        value: 'risk',
                        emoji: '⚠️'
                    },
                    {
                        label: 'Success Chance',
                        description: 'Set success chance',
                        value: 'success_chance',
                        emoji: '🎯'
                    },
                    {
                        label: 'Cooldown',
                        description: 'Set cooldown period',
                        value: 'cooldown',
                        emoji: '⏰'
                    }
                ])
        );
    
    const backButton = createBackButton();

    await interaction.update({
        embeds: [embed],
        components: [selectRow, backButton],
        ephemeral: true
    });
}

/**
 * Handle Gambling System Configuration
 * Displays and processes gambling system settings like enabling/disabling,
 * success chance, maximum gambling percentage, and minimum streak requirements.
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleGamblingConfig(interaction, originalInteraction) {
    const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
    
    // Ensure default values
    const config = {
        enabled: gamblingConfig.enabled || false,
        successChance: gamblingConfig.successChance || 50,
        maxGamblePercent: gamblingConfig.maxGamblePercent || 50,
        minStreaks: gamblingConfig.minStreaks || 10
    };
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎲 Gambling System Configuration')
        .setDescription('Select a setting to configure:')
        .addFields(
            { name: 'Enable/Disable', value: `Current: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}` },
            { name: 'Success Chance', value: `Current: ${config.successChance}%` },
            { name: 'Max Gamble Percent', value: `Current: ${config.maxGamblePercent}%` },
            { name: 'Min Streaks', value: `Current: ${config.minStreaks} streaks` }
        );

    const selectRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('gambling_select')
                .setPlaceholder('Select a setting')
                .addOptions([
                    {
                        label: `Enable/Disable ${config.enabled ? '✅' : '❌'}`,
                        description: 'Toggle gambling system',
                        value: 'toggle_gambling',
                        emoji: '🔒'
                    },
                    {
                        label: 'Success Chance',
                        description: 'Set success probability',
                        value: 'success_chance',
                        emoji: '🎯'
                    },
                    {
                        label: 'Max Gamble Percent',
                        description: 'Set maximum gambling percentage',
                        value: 'max_gamble',
                        emoji: '💰'
                    },
                    {
                        label: 'Min Streaks',
                        description: 'Set minimum streaks required',
                        value: 'min_streaks',
                        emoji: '📊'
                    }
                ])
        );
    
    const backButton = createBackButton();

    await interaction.update({
        embeds: [embed],
        components: [selectRow, backButton],
        ephemeral: true
    });
}

/**
 * Creates a back button component that returns to the main menu
 * @returns {ActionRowBuilder} The back button row
 */
function createBackButton() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
        );
}

/**
 * Toggles the gambling system on/off
 * Updates the database and shows the new status to the user
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleToggleGambling(interaction, originalInteraction) {
    try {
        const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
        
        // Ensure defaults
        const currentConfig = {
            enabled: gamblingConfig.enabled || false,
            successChance: gamblingConfig.successChance || 50,
            maxGamblePercent: gamblingConfig.maxGamblePercent || 50,
            minStreaks: gamblingConfig.minStreaks || 10
        };
        
        const newStatus = !currentConfig.enabled;

        await streakManager.updateGamblingConfig(interaction.guildId, {
            enabled: newStatus,
            successChance: currentConfig.successChance,
            maxGamblePercent: currentConfig.maxGamblePercent,
            minStreaks: currentConfig.minStreaks
        });

        const status = newStatus ? 'enabled' : 'disabled';
        const embed = new EmbedBuilder()
            .setColor(newStatus ? '#00FF00' : '#FF0000')
            .setTitle('🎲 Gambling System Configuration')
            .setDescription(`Gambling system has been ${status}.`)
            .addFields(
                { name: 'Current Settings', value: 
                    `• Status: ${newStatus ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `• Success Chance: ${currentConfig.successChance}%\n` +
                    `• Max Gamble: ${currentConfig.maxGamblePercent}%\n` +
                    `• Min Streaks: ${currentConfig.minStreaks}`
                }
            );

        // Return to gambling config menu after updating
        await handleGamblingConfig(interaction, originalInteraction);
    } catch (error) {
        console.error('Error toggling gambling:', error);
        await interaction.update({
            content: '❌ An error occurred while toggling the gambling system.',
            ephemeral: true
        });
    }
}

/**
 * Configure gambling success chance (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleGamblingSuccessChance(interaction, originalInteraction) {
    // For now just return to gambling config
    await handleGamblingConfig(interaction, originalInteraction);
}

/**
 * Configure maximum gambling percentage (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleGamblingMaxPercent(interaction, originalInteraction) {
    // For now just return to gambling config
    await handleGamblingConfig(interaction, originalInteraction);
}

/**
 * Configure minimum streaks required for gambling (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleGamblingMinStreaks(interaction, originalInteraction) {
    // For now just return to gambling config
    await handleGamblingConfig(interaction, originalInteraction);
}

/**
 * Toggles the raid system on/off
 * Updates the database and shows the new status to the user
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleToggleRaid(interaction, originalInteraction) {
    try {
        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
        
        // Ensure defaults
        const currentConfig = {
            enabled: raidConfig.enabled || false,
            maxStealPercent: raidConfig.maxStealPercent || 20,
            riskPercent: raidConfig.riskPercent || 30,
            successChance: raidConfig.successChance || 40,
            cooldownHours: raidConfig.cooldownHours || 24
        };
        
        const newStatus = !currentConfig.enabled;

        await streakManager.updateRaidConfig(interaction.guildId, {
            enabled: newStatus,
            maxStealPercent: currentConfig.maxStealPercent,
            riskPercent: currentConfig.riskPercent,
            successChance: currentConfig.successChance,
            cooldownHours: currentConfig.cooldownHours
        });

        const status = newStatus ? 'enabled' : 'disabled';
        const embed = new EmbedBuilder()
            .setColor(newStatus ? '#00FF00' : '#FF0000')
            .setTitle('⚔️ Raid System Configuration')
            .setDescription(`Raid system has been ${status}.`)
            .addFields(
                { name: 'Current Settings', value: 
                    `• Status: ${newStatus ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `• Max Steal: ${currentConfig.maxStealPercent}%\n` +
                    `• Risk: ${currentConfig.riskPercent}%\n` +
                    `• Success Chance: ${currentConfig.successChance}%\n` +
                    `• Cooldown: ${currentConfig.cooldownHours}h`
                }
            );

        // Return to raid config menu after updating
        await handleRaidConfig(interaction, originalInteraction);
    } catch (error) {
        console.error('Error toggling raid system:', error);
        await interaction.update({
            content: '❌ An error occurred while toggling the raid system.',
            ephemeral: true
        });
    }
}

/**
 * Configure maximum raid steal percentage (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidMaxSteal(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

/**
 * Configure raid risk percentage (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidRisk(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

/**
 * Configure raid success chance (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidSuccessChance(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

/**
 * Configure raid cooldown period (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidCooldown(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

/**
 * Configure trigger words for streaks (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleTriggerWords(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

/**
 * Configure streak limits (not implemented yet)
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleStreakLimit(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

/**
 * Toggles the streak streak feature on/off
 * Updates the database and shows the new status to the user
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleStreakStreak(interaction, originalInteraction) {
    try {
        const currentStatus = await streakManager.isStreakStreakEnabled(interaction.guildId);
        const newStatus = !currentStatus;
        
        // Update streak streak status
        await streakManager.setStreakStreakEnabled(interaction.guildId, newStatus);
        
        const status = newStatus ? 'enabled' : 'disabled';
        const embed = new EmbedBuilder()
            .setColor(newStatus ? '#00FF00' : '#FF0000')
            .setTitle('📅 Streak Streak Configuration')
            .setDescription(`Streak Streak tracking has been ${status}.`)
            .addFields(
                { name: 'What is Streak Streak?', value: 
                    `Streak Streak tracks how many consecutive days a user has maintained their streaks.\n` +
                    `When ${newStatus ? 'enabled' : 'disabled'}, users ${newStatus ? 'will' : 'will not'} earn streak streak bonuses.`
                }
            );
            
        // Return to core config menu after updating
        await handleCoreConfig(interaction, originalInteraction);
    } catch (error) {
        console.error('Error toggling streak streak:', error);
        await interaction.update({
            content: '❌ An error occurred while toggling the streak streak feature.',
            ephemeral: true
        });
    }
}

// Add this function at the end of the file to rebuild the main menu
async function showMainMenu(interaction, guildId) {
    try {
        // Get current configurations
        const raidConfig = await streakManager.getRaidConfig(guildId);
        const gamblingConfig = await streakManager.getGamblingConfig(guildId);
        const streakStreakEnabled = await streakManager.isStreakStreakEnabled(guildId);
        const triggerWords = await streakManager.getTriggerWords(guildId);
        const streakLimit = await streakManager.getStreakLimit(guildId);

        // Ensure default values for any undefined properties
        const raidDefaults = {
            enabled: raidConfig.enabled || false,
            maxStealPercent: raidConfig.maxStealPercent || 20,
            riskPercent: raidConfig.riskPercent || 30,
            successChance: raidConfig.successChance || 40,
            cooldownHours: raidConfig.cooldownHours || 24
        };

        const gamblingDefaults = {
            enabled: gamblingConfig.enabled || false,
            successChance: gamblingConfig.successChance || 50,
            maxGamblePercent: gamblingConfig.maxGamblePercent || 50,
            minStreaks: gamblingConfig.minStreaks || 10
        };

        // Create the main embed with current configuration summary
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('⚙️ Server Configuration')
            .setDescription('Select a feature to configure from the dropdown menu below.')
            .addFields(
                { name: '🎯 Core Features', value: `Trigger Words: ${triggerWords.join(', ') || 'None'}\nStreak Limit: ${streakLimit || 'None'}\nStreak Streak: ${streakStreakEnabled ? '✅ Enabled' : '❌ Disabled'}` },
                { name: '⚔️ Raid System', value: `Status: ${raidDefaults.enabled ? '✅ Enabled' : '❌ Disabled'}\nMax Steal: ${raidDefaults.maxStealPercent}%\nRisk: ${raidDefaults.riskPercent}%\nSuccess Chance: ${raidDefaults.successChance}%\nCooldown: ${raidDefaults.cooldownHours}h` },
                { name: '🎲 Gambling System', value: `Status: ${gamblingDefaults.enabled ? '✅ Enabled' : '❌ Disabled'}\nSuccess Chance: ${gamblingDefaults.successChance}%\nMax Gamble: ${gamblingDefaults.maxGamblePercent}%\nMin Streaks: ${gamblingDefaults.minStreaks}` }
            );

        // Create the main feature selection dropdown menu
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('config_select')
                    .setPlaceholder('Select a feature to configure')
                    .addOptions([
                        {
                            label: 'Core Features',
                            description: 'Configure trigger words and basic settings',
                            value: 'core',
                            emoji: '🎯'
                        },
                        {
                            label: `Raid System ${raidDefaults.enabled ? '✅' : '❌'}`,
                            description: 'Configure raid settings and parameters',
                            value: 'raid',
                            emoji: '⚔️'
                        },
                        {
                            label: `Gambling System ${gamblingDefaults.enabled ? '✅' : '❌'}`,
                            description: 'Configure gambling settings and odds',
                            value: 'gambling',
                            emoji: '🎲'
                        }
                    ])
            );

        await interaction.update({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error showing main menu:', error);
        await interaction.update({
            content: '❌ An error occurred while returning to the main menu.',
            components: [],
            ephemeral: true
        });
    }
}