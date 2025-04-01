const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-embed')
        .setDescription('Open the interactive configuration panel')
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

            // Create the main embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('⚙️ Server Configuration')
                .setDescription('Select a feature to configure from the dropdown menu below.')
                .addFields(
                    { name: '🎯 Core Features', value: `Trigger Words: ${triggerWords.join(', ') || 'None'}\nStreak Limit: ${streakLimit || 'None'}\nStreak Streak: ${streakStreakEnabled ? '✅ Enabled' : '❌ Disabled'}` },
                    { name: '⚔️ Raid System', value: `Status: ${raidConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\nMax Steal: ${raidConfig.maxStealPercent}%\nRisk: ${raidConfig.riskPercent}%\nSuccess Chance: ${raidConfig.successChance}%\nCooldown: ${raidConfig.cooldownHours}h` },
                    { name: '🎲 Gambling System', value: `Status: ${gamblingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\nSuccess Chance: ${gamblingConfig.successChance}%\nMax Gamble: ${gamblingConfig.maxGamblePercent}%\nMin Streaks: ${gamblingConfig.minStreaks}` }
                );

            // Create the dropdown menu
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

            // Create a collector for the dropdown menu
            const collector = message.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({
                        content: '❌ Only the command user can use this menu.'
                    });
                }

                try {
                    // Check for main menu selections
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
                    // Check for back button
                    else if (i.customId === 'back_to_main') {
                        await module.exports.execute(interaction);
                    }
                    // Check for gambling options
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
                    // Handle raid configuration options
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
                    // Handle core configuration options
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

            collector.on('end', async () => {
                await interaction.editReply({
                    content: '⏰ Configuration panel timed out. Use /setup-embed to open a new panel.',
                    components: []
                , ephemeral: true});
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

// Helper functions for handling different configuration sections
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

async function handleRaidConfig(interaction, originalInteraction) {
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚔️ Raid System Configuration')
        .setDescription('Select a setting to configure:')
        .addFields(
            { name: 'Enable/Disable', value: `Current: ${raidConfig.enabled ? '✅ Enabled' : '❌ Disabled'}` },
            { name: 'Max Steal', value: `Current: ${raidConfig.maxStealPercent}%` },
            { name: 'Risk', value: `Current: ${raidConfig.riskPercent}%` },
            { name: 'Success Chance', value: `Current: ${raidConfig.successChance}%` },
            { name: 'Cooldown', value: `Current: ${raidConfig.cooldownHours}h` }
        );

    const selectRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('raid_select')
                .setPlaceholder('Select a setting')
                .addOptions([
                    {
                        label: `Enable/Disable ${raidConfig.enabled ? '✅' : '❌'}`,
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

async function handleGamblingConfig(interaction, originalInteraction) {
    const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎲 Gambling System Configuration')
        .setDescription('Select a setting to configure:')
        .addFields(
            { name: 'Enable/Disable', value: `Current: ${gamblingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}` },
            { name: 'Success Chance', value: `Current: ${gamblingConfig.successChance || 50}%` },
            { name: 'Max Gamble Percent', value: `Current: ${gamblingConfig.maxGamblePercent || 50}%` },
            { name: 'Min Streaks', value: `Current: ${gamblingConfig.minStreaks || 10} streaks` }
        );

    const selectRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('gambling_select')
                .setPlaceholder('Select a setting')
                .addOptions([
                    {
                        label: `Enable/Disable ${gamblingConfig.enabled ? '✅' : '❌'}`,
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

// Add back button function
function createBackButton() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
        );
}

// Handlers for gambling config options
async function handleToggleGambling(interaction, originalInteraction) {
    try {
        const currentConfig = await streakManager.getGamblingConfig(interaction.guildId);
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

// Placeholder functions for other gambling settings
async function handleGamblingSuccessChance(interaction, originalInteraction) {
    // For now just return to gambling config
    await handleGamblingConfig(interaction, originalInteraction);
}

async function handleGamblingMaxPercent(interaction, originalInteraction) {
    // For now just return to gambling config
    await handleGamblingConfig(interaction, originalInteraction);
}

async function handleGamblingMinStreaks(interaction, originalInteraction) {
    // For now just return to gambling config
    await handleGamblingConfig(interaction, originalInteraction);
}

// Placeholder functions for other configuration options
async function handleToggleRaid(interaction, originalInteraction) {
    try {
        const currentConfig = await streakManager.getRaidConfig(interaction.guildId);
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

async function handleRaidMaxSteal(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

async function handleRaidRisk(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

async function handleRaidSuccessChance(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

async function handleRaidCooldown(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

async function handleTriggerWords(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

async function handleStreakLimit(interaction, originalInteraction) {
    // Implementation needed
    await interaction.update({
        content: '❌ This feature is not implemented yet.',
        ephemeral: true
    });
}

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