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
                    { name: '⚔️ Raid System', value: `Status: ${raidConfig.enabled ? '✅ Enabled' : '❌ Disabled'}` },
                    { name: '🎲 Gambling System', value: `Status: ${gamblingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}` }
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
                            case 'success_chance':
                                await handleRaidSuccessChance(i, interaction);
                                break;
                            case 'steal_settings':
                                await handleRaidStealSettings(i, interaction);
                                break;
                            case 'risk_settings':
                                await handleRaidRiskSettings(i, interaction);
                                break;
                            case 'cooldown_settings':
                                await handleRaidCooldownSettings(i, interaction);
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

                    // Handle Max Steal buttons
                    if (i.customId === 'raid_maxsteal_minus10' || i.customId === 'raid_maxsteal_minus5' || 
                        i.customId === 'raid_maxsteal_plus5' || i.customId === 'raid_maxsteal_plus10') {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let newValue = raidConfig.maxStealPercent || 20;
                        
                        // Adjust the value based on which button was clicked
                        if (i.customId === 'raid_maxsteal_minus10') newValue = Math.max(1, newValue - 10);
                        if (i.customId === 'raid_maxsteal_minus5') newValue = Math.max(1, newValue - 5);
                        if (i.customId === 'raid_maxsteal_plus5') newValue = Math.min(100, newValue + 5);
                        if (i.customId === 'raid_maxsteal_plus10') newValue = Math.min(100, newValue + 10);
                        
                        // Update the config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            maxStealPercent: newValue
                        });
                        
                        // Show the updated config
                        await handleRaidMaxSteal(i, interaction);
                        return;
                    }

                    // Handle Risk buttons
                    if (i.customId === 'raid_risk_minus10' || i.customId === 'raid_risk_minus5' || 
                        i.customId === 'raid_risk_plus5' || i.customId === 'raid_risk_plus10') {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let newValue = raidConfig.riskPercent || 30;
                        
                        // Adjust the value based on which button was clicked
                        if (i.customId === 'raid_risk_minus10') newValue = Math.max(1, newValue - 10);
                        if (i.customId === 'raid_risk_minus5') newValue = Math.max(1, newValue - 5);
                        if (i.customId === 'raid_risk_plus5') newValue = Math.min(100, newValue + 5);
                        if (i.customId === 'raid_risk_plus10') newValue = Math.min(100, newValue + 10);
                        
                        // Update the config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            riskPercent: newValue
                        });
                        
                        // Show the updated config
                        await handleRaidRisk(i, interaction);
                        return;
                    }

                    // Handle Success Chance buttons
                    if (i.customId === 'raid_success_minus10' || i.customId === 'raid_success_minus5' || 
                        i.customId === 'raid_success_plus5' || i.customId === 'raid_success_plus10') {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let newValue = raidConfig.successChance || 40;
                        
                        // Adjust the value based on which button was clicked
                        if (i.customId === 'raid_success_minus10') newValue = Math.max(1, newValue - 10);
                        if (i.customId === 'raid_success_minus5') newValue = Math.max(1, newValue - 5);
                        if (i.customId === 'raid_success_plus5') newValue = Math.min(100, newValue + 5);
                        if (i.customId === 'raid_success_plus10') newValue = Math.min(100, newValue + 10);
                        
                        // Update the config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            successChance: newValue
                        });
                        
                        // Show the updated config
                        await handleRaidSuccessChance(i, interaction);
                        return;
                    }

                    // Handle Cooldown buttons
                    if (i.customId === 'raid_cooldown_minus6' || i.customId === 'raid_cooldown_minus1' || 
                        i.customId === 'raid_cooldown_plus1' || i.customId === 'raid_cooldown_plus6') {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let newValue = raidConfig.cooldownHours || 24;
                        
                        // Adjust the value based on which button was clicked
                        if (i.customId === 'raid_cooldown_minus6') newValue = Math.max(1, newValue - 6);
                        if (i.customId === 'raid_cooldown_minus1') newValue = Math.max(1, newValue - 1);
                        if (i.customId === 'raid_cooldown_plus1') newValue = Math.min(168, newValue + 1); // Max 1 week
                        if (i.customId === 'raid_cooldown_plus6') newValue = Math.min(168, newValue + 6);
                        
                        // Update the config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            cooldownHours: newValue
                        });
                        
                        // Show the updated config
                        await handleRaidCooldown(i, interaction);
                        return;
                    }

                    // Add a handler for the back button
                    if (i.customId === 'back_to_raid_config') {
                        await handleRaidConfig(i, interaction);
                        return;
                    }

                    // Add these button handlers for gambling configuration

                    // Handle Gambling Success Chance buttons
                    if (i.customId === 'gambling_success_minus10' || i.customId === 'gambling_success_minus5' || 
                        i.customId === 'gambling_success_plus5' || i.customId === 'gambling_success_plus10') {
                        const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
                        let newValue = gamblingConfig.successChance || 50;
                        
                        // Adjust the value based on which button was clicked
                        if (i.customId === 'gambling_success_minus10') newValue = Math.max(1, newValue - 10);
                        if (i.customId === 'gambling_success_minus5') newValue = Math.max(1, newValue - 5);
                        if (i.customId === 'gambling_success_plus5') newValue = Math.min(99, newValue + 5);
                        if (i.customId === 'gambling_success_plus10') newValue = Math.min(99, newValue + 10);
                        
                        // Update the config
                        await streakManager.updateGamblingConfig(interaction.guildId, {
                            ...gamblingConfig,
                            successChance: newValue
                        });
                        
                        // Show the updated config
                        await handleGamblingSuccessChance(i, interaction);
                        return;
                    }

                    // Handle Max Gamble Percent buttons
                    if (i.customId === 'gambling_max_minus10' || i.customId === 'gambling_max_minus5' || 
                        i.customId === 'gambling_max_plus5' || i.customId === 'gambling_max_plus10') {
                        const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
                        let newValue = gamblingConfig.maxGamblePercent || 50;
                        
                        // Adjust the value based on which button was clicked
                        if (i.customId === 'gambling_max_minus10') newValue = Math.max(1, newValue - 10);
                        if (i.customId === 'gambling_max_minus5') newValue = Math.max(1, newValue - 5);
                        if (i.customId === 'gambling_max_plus5') newValue = Math.min(100, newValue + 5);
                        if (i.customId === 'gambling_max_plus10') newValue = Math.min(100, newValue + 10);
                        
                        // Update the config
                        await streakManager.updateGamblingConfig(interaction.guildId, {
                            ...gamblingConfig,
                            maxGamblePercent: newValue
                        });
                        
                        // Show the updated config
                        await handleGamblingMaxPercent(i, interaction);
                        return;
                    }

                    // Handle Min Streaks buttons
                    if (i.customId === 'gambling_min_minus5' || i.customId === 'gambling_min_minus1' || 
                        i.customId === 'gambling_min_plus1' || i.customId === 'gambling_min_plus5') {
                        const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
                        let newValue = gamblingConfig.minStreaks || 10;
                        
                        // Adjust the value based on which button was clicked
                        if (i.customId === 'gambling_min_minus5') newValue = Math.max(1, newValue - 5);
                        if (i.customId === 'gambling_min_minus1') newValue = Math.max(1, newValue - 1);
                        if (i.customId === 'gambling_min_plus1') newValue = Math.min(100, newValue + 1);
                        if (i.customId === 'gambling_min_plus5') newValue = Math.min(100, newValue + 5);
                        
                        // Update the config
                        await streakManager.updateGamblingConfig(interaction.guildId, {
                            ...gamblingConfig,
                            minStreaks: newValue
                        });
                        
                        // Show the updated config
                        await handleGamblingMinStreaks(i, interaction);
                        return;
                    }

                    // Add back button handler for gambling config
                    if (i.customId === 'back_to_gambling_config') {
                        await handleGamblingConfig(i, interaction);
                        return;
                    }

                    // Add these button handlers for streak limit configuration

                    // Handle Streak Limit buttons
                    if (i.customId === 'streak_limit_minus3' || i.customId === 'streak_limit_minus1' || 
                        i.customId === 'streak_limit_plus1' || i.customId === 'streak_limit_plus3' || 
                        i.customId === 'streak_limit_toggle') {
                        
                        // Get current limit in minutes
                        const currentLimit = await streakManager.getStreakLimit(interaction.guildId);
                        const currentHours = currentLimit ? Math.floor(currentLimit / 60) : 0;
                        let newHours = currentHours;
                        
                        // Adjust the value based on which button was clicked
                        if (i.customId === 'streak_limit_minus3') newHours = Math.max(0, newHours - 3);
                        if (i.customId === 'streak_limit_minus1') newHours = Math.max(0, newHours - 1);
                        if (i.customId === 'streak_limit_plus1') newHours = Math.min(24, newHours + 1);
                        if (i.customId === 'streak_limit_plus3') newHours = Math.min(24, newHours + 3);
                        if (i.customId === 'streak_limit_toggle') newHours = currentHours > 0 ? 0 : 1; // Toggle between 0 and 1 hour
                        
                        // Convert hours to minutes for storage
                        const newMinutes = newHours * 60;
                        
                        // Update the config
                        await streakManager.setStreakLimit(interaction.guildId, newMinutes);
                        
                        // Show the updated config
                        await handleStreakLimit(i, interaction);
                        return;
                    }

                    // Add back button handler for core config
                    if (i.customId === 'back_to_core_config') {
                        await handleCoreConfig(i, interaction);
                        return;
                    }

                    // Add these button handlers for the raid settings

                    // Steal percentage adjustment
                    if (i.customId.startsWith('raid_steal_percent_')) {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let value = raidConfig.maxStealPercent || 20;
                        
                        if (i.customId === 'raid_steal_percent_minus10') value = Math.max(1, value - 10);
                        if (i.customId === 'raid_steal_percent_minus5') value = Math.max(1, value - 5);
                        if (i.customId === 'raid_steal_percent_plus5') value = Math.min(100, value + 5);
                        if (i.customId === 'raid_steal_percent_plus10') value = Math.min(100, value + 10);
                        
                        // Update config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            maxStealPercent: value
                        });
                        
                        // Show updated settings
                        await handleRaidStealSettings(i, interaction);
                        return;
                    }

                    // Steal min amount adjustment
                    if (i.customId.startsWith('raid_steal_min_')) {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let value = raidConfig.minStealAmount || 5;
                        
                        if (i.customId === 'raid_steal_min_minus5') value = Math.max(1, value - 5);
                        if (i.customId === 'raid_steal_min_minus1') value = Math.max(1, value - 1);
                        if (i.customId === 'raid_steal_min_plus1') value = value + 1;
                        if (i.customId === 'raid_steal_min_plus5') value = value + 5;
                        
                        // Ensure min <= max
                        const maxValue = raidConfig.maxStealAmount || 30;
                        if (value > maxValue) value = maxValue;
                        
                        // Update config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            minStealAmount: value
                        });
                        
                        // Show updated settings
                        await handleRaidStealSettings(i, interaction);
                        return;
                    }

                    // Steal max amount adjustment
                    if (i.customId.startsWith('raid_steal_max_')) {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let value = raidConfig.maxStealAmount || 30;
                        
                        if (i.customId === 'raid_steal_max_minus5') value = Math.max(1, value - 5);
                        if (i.customId === 'raid_steal_max_minus1') value = Math.max(1, value - 1);
                        if (i.customId === 'raid_steal_max_plus1') value = value + 1;
                        if (i.customId === 'raid_steal_max_plus5') value = value + 5;
                        
                        // Ensure min <= max
                        const minValue = raidConfig.minStealAmount || 5;
                        if (value < minValue) value = minValue;
                        
                        // Update config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            maxStealAmount: value
                        });
                        
                        // Show updated settings
                        await handleRaidStealSettings(i, interaction);
                        return;
                    }

                    // Risk percentage adjustment
                    if (i.customId.startsWith('raid_risk_percent_')) {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let value = raidConfig.riskPercent || 15;
                        
                        if (i.customId === 'raid_risk_percent_minus10') value = Math.max(1, value - 10);
                        if (i.customId === 'raid_risk_percent_minus5') value = Math.max(1, value - 5);
                        if (i.customId === 'raid_risk_percent_plus5') value = Math.min(100, value + 5);
                        if (i.customId === 'raid_risk_percent_plus10') value = Math.min(100, value + 10);
                        
                        // Update config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            riskPercent: value
                        });
                        
                        // Show updated settings
                        await handleRaidRiskSettings(i, interaction);
                        return;
                    }

                    // Risk min amount adjustment
                    if (i.customId.startsWith('raid_risk_min_')) {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let value = raidConfig.minRiskAmount || 3;
                        
                        if (i.customId === 'raid_risk_min_minus5') value = Math.max(1, value - 5);
                        if (i.customId === 'raid_risk_min_minus1') value = Math.max(1, value - 1);
                        if (i.customId === 'raid_risk_min_plus1') value = value + 1;
                        if (i.customId === 'raid_risk_min_plus5') value = value + 5;
                        
                        // Ensure min <= max
                        const maxValue = raidConfig.maxRiskAmount || 20;
                        if (value > maxValue) value = maxValue;
                        
                        // Update config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            minRiskAmount: value
                        });
                        
                        // Show updated settings
                        await handleRaidRiskSettings(i, interaction);
                        return;
                    }

                    // Risk max amount adjustment
                    if (i.customId.startsWith('raid_risk_max_')) {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let value = raidConfig.maxRiskAmount || 20;
                        
                        if (i.customId === 'raid_risk_max_minus5') value = Math.max(1, value - 5);
                        if (i.customId === 'raid_risk_max_minus1') value = Math.max(1, value - 1);
                        if (i.customId === 'raid_risk_max_plus1') value = value + 1;
                        if (i.customId === 'raid_risk_max_plus5') value = value + 5;
                        
                        // Ensure min <= max
                        const minValue = raidConfig.minRiskAmount || 3;
                        if (value < minValue) value = minValue;
                        
                        // Update config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            maxRiskAmount: value
                        });
                        
                        // Show updated settings
                        await handleRaidRiskSettings(i, interaction);
                        return;
                    }

                    // Cooldown adjustments
                    if (i.customId.startsWith('raid_success_cooldown_') || i.customId.startsWith('raid_failure_cooldown_')) {
                        const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                        let successValue = raidConfig.successCooldownHours || 4;
                        let failureValue = raidConfig.failureCooldownHours || 2;
                        
                        if (i.customId === 'raid_success_cooldown_minus1') successValue = Math.max(1, successValue - 1);
                        if (i.customId === 'raid_success_cooldown_plus1') successValue = Math.min(24, successValue + 1);
                        if (i.customId === 'raid_failure_cooldown_minus1') failureValue = Math.max(0, failureValue - 1);
                        if (i.customId === 'raid_failure_cooldown_plus1') failureValue = Math.min(24, failureValue + 1);
                        
                        // Update config
                        await streakManager.updateRaidConfig(interaction.guildId, {
                            ...raidConfig,
                            successCooldownHours: successValue,
                            failureCooldownHours: failureValue
                        });
                        
                        // Show updated settings
                        await handleRaidCooldownSettings(i, interaction);
                        return;
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
    
    // Ensure defaults for all values
    const config = {
        enabled: raidConfig.enabled || false,
        maxStealPercent: raidConfig.maxStealPercent || 20,
        riskPercent: raidConfig.riskPercent || 15,
        successChance: raidConfig.successChance || 50,
        minStealAmount: raidConfig.minStealAmount || 5,
        maxStealAmount: raidConfig.maxStealAmount || 30,
        minRiskAmount: raidConfig.minRiskAmount || 3,
        maxRiskAmount: raidConfig.maxRiskAmount || 20,
        successCooldownHours: raidConfig.successCooldownHours || 4,
        failureCooldownHours: raidConfig.failureCooldownHours || 2
    };
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚔️ Raid System Configuration')
        .setDescription('Select a setting to configure:')
        .addFields(
            { name: 'Enable/Disable', value: `Current: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}` },
            { name: 'Success Chance', value: `Base: ${config.successChance}% (+5% initiator bonus, +3-15% progressive bonus based on target's streak)` },
            { name: 'Max Steal', value: `Current: ${config.maxStealPercent}% (Min: ${config.minStealAmount}, Max: ${config.maxStealAmount})` },
            { name: 'Risk', value: `Current: ${config.riskPercent}% (Min: ${config.minRiskAmount}, Max: ${config.maxRiskAmount})` },
            { name: 'Cooldown', value: `Success: ${config.successCooldownHours}h | Failure: ${config.failureCooldownHours}h` }
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
                        label: 'Success Chance',
                        description: 'Set success chance',
                        value: 'success_chance',
                        emoji: '🎯'
                    },
                    {
                        label: 'Steal Settings',
                        description: 'Configure max steal % and min/max values',
                        value: 'steal_settings',
                        emoji: '💰'
                    },
                    {
                        label: 'Risk Settings',
                        description: 'Configure risk % and min/max values',
                        value: 'risk_settings',
                        emoji: '⚠️'
                    },
                    {
                        label: 'Cooldown Times',
                        description: 'Set cooldown for success/failure',
                        value: 'cooldown_settings',
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
 * Configure gambling success chance
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleGamblingSuccessChance(interaction, originalInteraction) {
    // Get current configuration
    const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎯 Gambling Success Chance Configuration')
        .setDescription('Set the percentage chance of winning when gambling.')
        .addFields(
            { name: 'Current Setting', value: `${gamblingConfig.successChance || 50}%` },
            { name: 'Recommended', value: 'Between 40% and 60%' },
            { name: 'Instructions', value: 'Use the buttons below to adjust the value' }
        );
    
    // Create buttons for adjusting the value
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('gambling_success_minus10')
                .setLabel('-10%')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('gambling_success_minus5')
                .setLabel('-5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('gambling_success_plus5')
                .setLabel('+5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('gambling_success_plus10')
                .setLabel('+10%')
                .setStyle(ButtonStyle.Success)
        );
        
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_gambling_config')
                .setLabel('Back to Gambling Config')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [row, backRow],
        ephemeral: true
    });
}

/**
 * Configure maximum gambling percentage
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleGamblingMaxPercent(interaction, originalInteraction) {
    // Get current configuration
    const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('💰 Max Gambling Percentage Configuration')
        .setDescription('Set the maximum percentage of streaks that can be gambled at once.')
        .addFields(
            { name: 'Current Setting', value: `${gamblingConfig.maxGamblePercent || 50}%` },
            { name: 'Recommended', value: 'Between 25% and 75%' },
            { name: 'Instructions', value: 'Use the buttons below to adjust the value' }
        );
    
    // Create buttons for adjusting the value
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('gambling_max_minus10')
                .setLabel('-10%')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('gambling_max_minus5')
                .setLabel('-5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('gambling_max_plus5')
                .setLabel('+5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('gambling_max_plus10')
                .setLabel('+10%')
                .setStyle(ButtonStyle.Success)
        );
        
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_gambling_config')
                .setLabel('Back to Gambling Config')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [row, backRow],
        ephemeral: true
    });
}

/**
 * Configure minimum streaks required for gambling
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleGamblingMinStreaks(interaction, originalInteraction) {
    // Get current configuration
    const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 Minimum Streaks Configuration')
        .setDescription('Set the minimum number of streaks required to gamble.')
        .addFields(
            { name: 'Current Setting', value: `${gamblingConfig.minStreaks || 10} streaks` },
            { name: 'Recommended', value: 'Between 5 and 20 streaks' },
            { name: 'Instructions', value: 'Use the buttons below to adjust the value' }
        );
    
    // Create buttons for adjusting the value
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('gambling_min_minus5')
                .setLabel('-5')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('gambling_min_minus1')
                .setLabel('-1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('gambling_min_plus1')
                .setLabel('+1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('gambling_min_plus5')
                .setLabel('+5')
                .setStyle(ButtonStyle.Success)
        );
        
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_gambling_config')
                .setLabel('Back to Gambling Config')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [row, backRow],
        ephemeral: true
    });
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
 * Configure maximum raid steal percentage
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidMaxSteal(interaction, originalInteraction) {
    // Get current configuration
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚔️ Raid Max Steal Configuration')
        .setDescription('Set the maximum percentage of streaks that can be stolen in a successful raid.')
        .addFields(
            { name: 'Current Setting', value: `${raidConfig.maxStealPercent || 20}%` },
            { name: 'Recommended', value: 'Between 10% and 30%' },
            { name: 'Instructions', value: 'Use the buttons below to adjust the value' }
        );
    
    // Create buttons for adjusting the value
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_maxsteal_minus10')
                .setLabel('-10%')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('raid_maxsteal_minus5')
                .setLabel('-5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_maxsteal_plus5')
                .setLabel('+5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_maxsteal_plus10')
                .setLabel('+10%')
                .setStyle(ButtonStyle.Success)
        );
        
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_raid_config')
                .setLabel('Back to Raid Settings')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [row, backRow],
        ephemeral: true
    });
}

/**
 * Configure raid risk percentage
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidRisk(interaction, originalInteraction) {
    // Get current configuration
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚠️ Raid Risk Configuration')
        .setDescription('Set the percentage of streaks that will be lost on a failed raid.')
        .addFields(
            { name: 'Current Setting', value: `${raidConfig.riskPercent || 30}%` },
            { name: 'Recommended', value: 'Between 20% and 50%' },
            { name: 'Instructions', value: 'Use the buttons below to adjust the value' }
        );
    
    // Create buttons for adjusting the value
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_risk_minus10')
                .setLabel('-10%')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('raid_risk_minus5')
                .setLabel('-5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_plus5')
                .setLabel('+5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_plus10')
                .setLabel('+10%')
                .setStyle(ButtonStyle.Success)
        );
        
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_raid_config')
                .setLabel('Back to Raid Settings')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [row, backRow],
        ephemeral: true
    });
}

/**
 * Configure raid success chance
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidSuccessChance(interaction, originalInteraction) {
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    const currentChance = raidConfig.successChance || 50;
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚔️ Raid Success Chance')
        .setDescription(`Configure the base chance of success for raids.\n\n**Bonus System:**\n• All raiders get +5% bonus chance when initiating a raid\n• Progressive bonus based on target's streak size:\n  - Streaks 10-24: +3%\n  - Streaks 25-49: +6%\n  - Streaks 50-74: +9%\n  - Streaks 75-99: +12%\n  - Streaks 100+: +15%\n\nThis helps balance the game by giving underdogs a better chance to raid high-streak players.`)
        .addFields(
            { name: 'Current Setting', value: `${currentChance}% base chance + bonuses` }
        );
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_success_minus10')
                .setLabel('-10%')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('raid_success_minus5')
                .setLabel('-5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_success_plus5')
                .setLabel('+5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_success_plus10')
                .setLabel('+10%')
                .setStyle(ButtonStyle.Primary)
        );
    
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_raid_config')
                .setLabel('Back to Raid Settings')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [row, backRow]
    });
}

/**
 * Configure raid cooldown period
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleRaidCooldown(interaction, originalInteraction) {
    // Get current configuration
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⏰ Raid Cooldown Configuration')
        .setDescription('Set the cooldown period in hours between raids.')
        .addFields(
            { name: 'Current Setting', value: `${raidConfig.cooldownHours || 24} hours` },
            { name: 'Recommended', value: 'Between 1 and 48 hours' },
            { name: 'Instructions', value: 'Use the buttons below to adjust the value' }
        );
    
    // Create buttons for adjusting the value
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_cooldown_minus6')
                .setLabel('-6 hours')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('raid_cooldown_minus1')
                .setLabel('-1 hour')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_cooldown_plus1')
                .setLabel('+1 hour')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_cooldown_plus6')
                .setLabel('+6 hours')
                .setStyle(ButtonStyle.Success)
        );
        
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_raid_config')
                .setLabel('Back to Raid Settings')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [row, backRow],
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
 * Configure streak limits
 * 
 * @param {Interaction} interaction - The Discord interaction
 * @param {Interaction} originalInteraction - The original command interaction
 */
async function handleStreakLimit(interaction, originalInteraction) {
    // Get current streak limit
    const currentLimit = await streakManager.getStreakLimit(interaction.guildId);
    const currentHours = currentLimit ? Math.floor(currentLimit / 60) : 0;
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⏰ Streak Update Interval')
        .setDescription('Set how frequently users can update their streaks.')
        .addFields(
            { name: 'Current Setting', value: currentLimit ? `${currentHours} hour${currentHours !== 1 ? 's' : ''} (${currentLimit} minutes)` : 'No limit (0)' },
            { name: 'Recommended', value: 'Between 1 and 12 hours' },
            { name: 'Instructions', value: 'Use the buttons below to adjust the value in hours (will be converted to minutes internally)' }
        );
    
    // Create buttons for adjusting the value
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('streak_limit_minus3')
                .setLabel('-3 hours')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('streak_limit_minus1')
                .setLabel('-1 hour')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('streak_limit_plus1')
                .setLabel('+1 hour')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('streak_limit_plus3')
                .setLabel('+3 hours')
                .setStyle(ButtonStyle.Success)
        );
    
    const toggleRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('streak_limit_toggle')
                .setLabel(currentLimit > 0 ? 'Disable Limit' : 'Enable Limit (1 hour)')
                .setStyle(currentLimit > 0 ? ButtonStyle.Danger : ButtonStyle.Success)
        );
        
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_core_config')
                .setLabel('Back to Core Config')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [row, toggleRow, backRow],
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

// Add these new handler functions for raid configuration

/**
 * Configure raid steal settings (percentage and min/max values)
 */
async function handleRaidStealSettings(interaction, originalInteraction) {
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('💰 Raid Steal Settings')
        .setDescription('Configure how much can be stolen in a successful raid')
        .addFields(
            { name: 'Max Steal Percentage', value: `${raidConfig.maxStealPercent || 20}%` },
            { name: 'Minimum Steal Amount', value: `${raidConfig.minStealAmount || 5} streaks` },
            { name: 'Maximum Steal Amount', value: `${raidConfig.maxStealAmount || 30} streaks` },
            { name: 'How it works', value: 'The system calculates a percentage (up to Max %) of the target\'s streaks, then ensures it\'s between the min and max values.' }
        );
    
    // Create percentage adjustment row
    const percentRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_steal_percent_minus10')
                .setLabel('-10%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_percent_minus5')
                .setLabel('-5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_percent_plus5')
                .setLabel('+5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_percent_plus10')
                .setLabel('+10%')
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Create min value adjustment row
    const minRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_steal_min_minus5')
                .setLabel('Min -5')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_min_minus1')
                .setLabel('Min -1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_min_plus1')
                .setLabel('Min +1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_min_plus5')
                .setLabel('Min +5')
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Create max value adjustment row
    const maxRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_steal_max_minus5')
                .setLabel('Max -5')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_max_minus1')
                .setLabel('Max -1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_max_plus1')
                .setLabel('Max +1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_steal_max_plus5')
                .setLabel('Max +5')
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Back button row
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_raid_config')
                .setLabel('Back to Raid Settings')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [percentRow, minRow, maxRow, backRow],
        ephemeral: true
    });
}

/**
 * Configure raid risk settings (percentage and min/max values)
 */
async function handleRaidRiskSettings(interaction, originalInteraction) {
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚠️ Raid Risk Settings')
        .setDescription('Configure how much is lost (and given to defender) in a failed raid')
        .addFields(
            { name: 'Risk Percentage', value: `${raidConfig.riskPercent || 15}%` },
            { name: 'Minimum Risk Amount', value: `${raidConfig.minRiskAmount || 3} streaks` },
            { name: 'Maximum Risk Amount', value: `${raidConfig.maxRiskAmount || 20} streaks` },
            { name: 'How it works', value: 'The system calculates a percentage of the attacker\'s streaks, then ensures it\'s between the min and max values.' }
        );
    
    // Create percentage adjustment row
    const percentRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_risk_percent_minus10')
                .setLabel('-10%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_percent_minus5')
                .setLabel('-5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_percent_plus5')
                .setLabel('+5%')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_percent_plus10')
                .setLabel('+10%')
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Create min value adjustment row
    const minRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_risk_min_minus5')
                .setLabel('Min -5')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_min_minus1')
                .setLabel('Min -1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_min_plus1')
                .setLabel('Min +1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_min_plus5')
                .setLabel('Min +5')
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Create max value adjustment row
    const maxRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_risk_max_minus5')
                .setLabel('Max -5')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_max_minus1')
                .setLabel('Max -1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_max_plus1')
                .setLabel('Max +1')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_risk_max_plus5')
                .setLabel('Max +5')
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Back button row
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_raid_config')
                .setLabel('Back to Raid Settings')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [percentRow, minRow, maxRow, backRow],
        ephemeral: true
    });
}

/**
 * Configure raid cooldown settings (success/failure)
 */
async function handleRaidCooldownSettings(interaction, originalInteraction) {
    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⏰ Raid Cooldown Settings')
        .setDescription('Configure how long users must wait between raids')
        .addFields(
            { name: 'Success Cooldown', value: `${raidConfig.successCooldownHours || 4} hours` },
            { name: 'Failure Cooldown', value: `${raidConfig.failureCooldownHours || 2} hours` },
            { name: 'How it works', value: 'Success cooldown applies after winning a raid. Failure cooldown (shorter) applies after losing a raid.' }
        );
    
    // Create success cooldown adjustment row
    const successRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_success_cooldown_minus1')
                .setLabel('Success -1h')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_success_cooldown_plus1')
                .setLabel('Success +1h')
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Create failure cooldown adjustment row
    const failureRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_failure_cooldown_minus1')
                .setLabel('Failure -1h')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('raid_failure_cooldown_plus1')
                .setLabel('Failure +1h')
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Back button row
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_raid_config')
                .setLabel('Back to Raid Settings')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [successRow, failureRow, backRow],
        ephemeral: true
    });
}