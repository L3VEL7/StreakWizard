const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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
                    { name: '🎯 Core Features', value: `Trigger Words: ${triggerWords.join(', ') || 'None'}\nStreak Limit: ${streakLimit || 'None'}\nStreak Streak: ${streakStreakEnabled ? 'Enabled' : 'Disabled'}` },
                    { name: '⚔️ Raid System', value: `Enabled: ${raidConfig.enabled ? 'Yes' : 'No'}\nMax Steal: ${raidConfig.maxStealPercent}%\nRisk: ${raidConfig.riskPercent}%\nSuccess Chance: ${raidConfig.successChance}%\nCooldown: ${raidConfig.cooldownHours}h` },
                    { name: '🎲 Gambling System', value: `Enabled: ${gamblingConfig.enabled ? 'Yes' : 'No'}\nWin Chance: ${gamblingConfig.winChance}%\nWin Multiplier: ${gamblingConfig.winMultiplier}x` }
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
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎯 Core Features Configuration')
        .setDescription('Select an option to configure:')
        .addFields(
            { name: 'Trigger Words', value: 'Add or remove trigger words for streaks' },
            { name: 'Streak Limit', value: 'Set how often users can update their streaks' },
            { name: 'Streak Streak', value: 'Enable or disable streak streak tracking' }
        );

    const row = new ActionRowBuilder()
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
                        label: 'Streak Streak',
                        description: 'Toggle streak streak feature',
                        value: 'streak_streak',
                        emoji: '📅'
                    }
                ])
        );

    await interaction.update({
        embeds: [embed],
        components: [row],
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
            { name: 'Enable/Disable', value: 'Turn the raid system on or off' },
            { name: 'Max Steal', value: `Current: ${raidConfig.maxStealPercent}%` },
            { name: 'Risk', value: `Current: ${raidConfig.riskPercent}%` },
            { name: 'Success Chance', value: `Current: ${raidConfig.successChance}%` },
            { name: 'Cooldown', value: `Current: ${raidConfig.cooldownHours}h` }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('raid_select')
                .setPlaceholder('Select a setting')
                .addOptions([
                    {
                        label: 'Enable/Disable',
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

    await interaction.update({
        embeds: [embed],
        components: [row],
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
            { name: 'Enable/Disable', value: 'Turn the gambling system on or off' },
            { name: 'Win Chance', value: `Current: ${gamblingConfig.winChance}%` },
            { name: 'Win Multiplier', value: `Current: ${gamblingConfig.winMultiplier}x` }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('gambling_select')
                .setPlaceholder('Select a setting')
                .addOptions([
                    {
                        label: 'Enable/Disable',
                        description: 'Toggle gambling system',
                        value: 'toggle_gambling',
                        emoji: '🔒'
                    },
                    {
                        label: 'Win Chance',
                        description: 'Set win probability',
                        value: 'win_chance',
                        emoji: '🎯'
                    },
                    {
                        label: 'Win Multiplier',
                        description: 'Set win multiplier',
                        value: 'win_multiplier',
                        emoji: '💰'
                    }
                ])
        );

    await interaction.update({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
} 