const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const streakManager = require('../storage/streakManager');

let pendingChanges = {
    core: {},
    raid: {},
    gambling: {}
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-embed')
        .setDescription('Open an interactive configuration panel for the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '❌ You need administrator permissions to use this command.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply();

            // Get current configurations
            const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
            const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
            const streakStreakEnabled = await streakManager.isStreakStreakEnabled(interaction.guildId);
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);

            // Create the main embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('⚙️ Bot Configuration Panel')
                .setDescription('Select a feature to configure from the dropdown menu below.')
                .addFields(
                    { name: '🎯 Core Features', value: `• Streak Streak: ${streakStreakEnabled ? '✅ Enabled' : '❌ Disabled'}\n• Trigger Words: ${triggerWords.length} configured`, inline: true },
                    { name: '⚔️ Raid System', value: `• Status: ${raidConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n• Max Steal: ${raidConfig.maxStealPercent}%\n• Risk: ${raidConfig.riskPercent}%`, inline: true },
                    { name: '🎲 Gambling System', value: `• Status: ${gamblingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n• Success: ${gamblingConfig.successChance}%\n• Max Gamble: ${gamblingConfig.maxGamblePercent}%`, inline: true }
                )
                .setFooter({ text: 'Use the dropdown menu below to configure features' })
                .setTimestamp();

            // Create the dropdown menu
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('config_select')
                        .setPlaceholder('Select a feature to configure')
                        .addOptions([
                            {
                                label: 'Core Features',
                                description: 'Configure streak streak and trigger words',
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

            // Send the initial embed and dropdown
            const message = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            // Create a collector for the dropdown
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                if (i.customId === 'config_select') {
                    const selectedValue = i.values[0];
                    
                    // Handle different configuration options
                    switch (selectedValue) {
                        case 'core':
                            await handleCoreConfig(i, streakStreakEnabled, triggerWords);
                            break;
                        case 'raid':
                            await handleRaidConfig(i, raidConfig);
                            break;
                        case 'gambling':
                            await handleGamblingConfig(i, gamblingConfig);
                            break;
                    }
                }
                if (i.customId === 'back_to_main') {
                    // Get fresh data
                    const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                    const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
                    const streakStreakEnabled = await streakManager.isStreakStreakEnabled(interaction.guildId);
                    const triggerWords = await streakManager.getTriggerWords(interaction.guildId);

                    // Recreate main embed
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('⚙️ Bot Configuration Panel')
                        .setDescription('Select a feature to configure from the dropdown menu below.')
                        .addFields(
                            { name: '🎯 Core Features', value: `• Streak Streak: ${streakStreakEnabled ? '✅ Enabled' : '❌ Disabled'}\n• Trigger Words: ${triggerWords.length} configured`, inline: true },
                            { name: '⚔️ Raid System', value: `• Status: ${raidConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n• Max Steal: ${raidConfig.maxStealPercent}%\n• Risk: ${raidConfig.riskPercent}%`, inline: true },
                            { name: '🎲 Gambling System', value: `• Status: ${gamblingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n• Success: ${gamblingConfig.successChance}%\n• Max Gamble: ${gamblingConfig.maxGamblePercent}%`, inline: true }
                        )
                        .setFooter({ text: 'Use the dropdown menu below to configure features' })
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('config_select')
                                .setPlaceholder('Select a feature to configure')
                                .addOptions([
                                    {
                                        label: 'Core Features',
                                        description: 'Configure streak streak and trigger words',
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

                    await i.update({
                        embeds: [embed],
                        components: [row]
                    });
                }

                if (i.customId.startsWith('save_')) {
                    const section = i.customId.split('_')[1];
                    try {
                        // Apply changes based on section
                        if (section === 'raid') {
                            await streakManager.updateRaidConfig(interaction.guildId, pendingChanges.raid);
                        } else if (section === 'gambling') {
                            await streakManager.updateGamblingConfig(interaction.guildId, pendingChanges.gambling);
                        } else if (section === 'core') {
                            if (pendingChanges.core.streakStreak !== undefined) {
                                await streakManager.setStreakStreakEnabled(interaction.guildId, pendingChanges.core.streakStreak);
                            }
                        }

                        // Clear pending changes
                        pendingChanges[section] = {};

                        // Show success message
                        const successEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('✅ Changes Saved')
                            .setDescription('Your changes have been successfully saved!')
                            .setTimestamp();

                        await i.update({
                            embeds: [successEmbed],
                            components: []
                        });

                        // Return to main menu after 2 seconds
                        setTimeout(async () => {
                            const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                            const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
                            const streakStreakEnabled = await streakManager.isStreakStreakEnabled(interaction.guildId);
                            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);

                            const mainEmbed = new EmbedBuilder()
                                .setColor('#0099ff')
                                .setTitle('⚙️ Bot Configuration Panel')
                                .setDescription('Select a feature to configure from the dropdown menu below.')
                                .addFields(
                                    { name: '🎯 Core Features', value: `• Streak Streak: ${streakStreakEnabled ? '✅ Enabled' : '❌ Disabled'}\n• Trigger Words: ${triggerWords.length} configured`, inline: true },
                                    { name: '⚔️ Raid System', value: `• Status: ${raidConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n• Max Steal: ${raidConfig.maxStealPercent}%\n• Risk: ${raidConfig.riskPercent}%`, inline: true },
                                    { name: '🎲 Gambling System', value: `• Status: ${gamblingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n• Success: ${gamblingConfig.successChance}%\n• Max Gamble: ${gamblingConfig.maxGamblePercent}%`, inline: true }
                                )
                                .setFooter({ text: 'Use the dropdown menu below to configure features' })
                                .setTimestamp();

                            const row = new ActionRowBuilder()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId('config_select')
                                        .setPlaceholder('Select a feature to configure')
                                        .addOptions([
                                            {
                                                label: 'Core Features',
                                                description: 'Configure streak streak and trigger words',
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

                            await interaction.editReply({
                                embeds: [mainEmbed],
                                components: [row]
                            });
                        }, 2000);
                    } catch (error) {
                        console.error('Error saving changes:', error);
                        await i.update({
                            content: '❌ An error occurred while saving changes.',
                            embeds: [],
                            components: []
                        });
                    }
                }

                if (i.customId === 'cancel_save') {
                    // Clear pending changes and return to main menu
                    pendingChanges = {
                        core: {},
                        raid: {},
                        gambling: {}
                    };
                    // ... existing back to main menu code ...
                }

                if (i.customId.startsWith('help_')) {
                    const section = i.customId.split('_')[1];
                    await handleHelp(i, section);
                }

                if (i.customId.startsWith('back_to_')) {
                    const section = i.customId.split('_')[2];
                    switch (section) {
                        case 'core':
                            const streakStreakEnabled = await streakManager.isStreakStreakEnabled(interaction.guildId);
                            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
                            await handleCoreConfig(i, streakStreakEnabled, triggerWords);
                            break;
                        case 'raid':
                            const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
                            await handleRaidConfig(i, raidConfig);
                            break;
                        case 'gambling':
                            const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);
                            await handleGamblingConfig(i, gamblingConfig);
                            break;
                    }
                }
            });

            collector.on('end', () => {
                // Disable the dropdown when the collector ends
                row.components[0].setDisabled(true);
                interaction.editReply({
                    embeds: [embed],
                    components: [row]
                }).catch(console.error);
            });

        } catch (error) {
            console.error('Error in setup-embed command:', error);
            const errorMessage = error.message || 'An error occurred while setting up the configuration panel.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }
        }
    }
};

// Helper function to handle core configuration
async function handleCoreConfig(interaction, streakStreakEnabled, triggerWords) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎯 Core Features Configuration')
        .setDescription('Select an option to configure:')
        .addFields(
            { name: 'Current Settings', value: `• Streak Streak: ${streakStreakEnabled ? '✅ Enabled' : '❌ Disabled'}\n• Trigger Words: ${triggerWords.length} configured` }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('core_select')
                .setPlaceholder('Select an option')
                .addOptions([
                    {
                        label: 'Toggle Streak Streak',
                        description: 'Enable or disable streak streak tracking',
                        value: 'toggle_streakstreak',
                        emoji: '🔄'
                    },
                    {
                        label: 'Manage Trigger Words',
                        description: 'Add or remove trigger words',
                        value: 'manage_trigger_words',
                        emoji: '📝'
                    }
                ])
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️'),
            new ButtonBuilder()
                .setCustomId('save_core')
                .setLabel('Save Changes')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💾'),
            new ButtonBuilder()
                .setCustomId('help_core')
                .setLabel('Help')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('❓')
        );

    await interaction.update({
        embeds: [embed],
        components: [row1, row2]
    });
}

// Helper function to handle raid configuration
async function handleRaidConfig(interaction, raidConfig) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚔️ Raid System Configuration')
        .setDescription('Select a setting to configure:')
        .addFields(
            { name: 'Current Settings', value: 
                `• Status: ${raidConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                `• Max Steal: ${raidConfig.maxStealPercent}%\n` +
                `• Risk: ${raidConfig.riskPercent}%\n` +
                `• Success Chance: ${raidConfig.successChance}%\n` +
                `• Cooldown: ${raidConfig.cooldownHours} hours`
            }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('raid_select')
                .setPlaceholder('Select a setting')
                .addOptions([
                    {
                        label: 'Toggle Raid System',
                        description: 'Enable or disable the raid feature',
                        value: 'toggle_raid',
                        emoji: '🔄'
                    },
                    {
                        label: 'Configure Parameters',
                        description: 'Adjust raid settings and parameters',
                        value: 'configure_raid',
                        emoji: '⚙️'
                    }
                ])
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️'),
            new ButtonBuilder()
                .setCustomId('save_raid')
                .setLabel('Save Changes')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💾')
        );

    await interaction.update({
        embeds: [embed],
        components: [row1, row2]
    });
}

// Helper function to handle gambling configuration
async function handleGamblingConfig(interaction, gamblingConfig) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎲 Gambling System Configuration')
        .setDescription('Select a setting to configure:')
        .addFields(
            { name: 'Current Settings', value: 
                `• Status: ${gamblingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                `• Success Chance: ${gamblingConfig.successChance}%\n` +
                `• Max Gamble: ${gamblingConfig.maxGamblePercent}%\n` +
                `• Min Streaks: ${gamblingConfig.minStreaks}`
            }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('gambling_select')
                .setPlaceholder('Select a setting')
                .addOptions([
                    {
                        label: 'Toggle Gambling',
                        description: 'Enable or disable the gambling feature',
                        value: 'toggle_gambling',
                        emoji: '🔄'
                    },
                    {
                        label: 'Configure Parameters',
                        description: 'Adjust gambling settings and odds',
                        value: 'configure_gambling',
                        emoji: '⚙️'
                    }
                ])
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️'),
            new ButtonBuilder()
                .setCustomId('save_gambling')
                .setLabel('Save Changes')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💾')
        );

    await interaction.update({
        embeds: [embed],
        components: [row1, row2]
    });
}

async function handleSaveChanges(interaction, section) {
    const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('⚠️ Confirm Changes')
        .setDescription('Are you sure you want to save these changes?')
        .addFields(
            { name: 'Pending Changes', value: Object.entries(pendingChanges[section])
                .map(([key, value]) => `• ${key}: ${value}`)
                .join('\n') || 'No changes pending' }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`save_${section}`)
                .setLabel('Save Changes')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💾'),
            new ButtonBuilder()
                .setCustomId('cancel_save')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}

// Add this function after the existing helper functions
async function handleHelp(interaction, section) {
    const helpTexts = {
        core: {
            title: '🎯 Core Features Help',
            description: 'Here\'s what each setting does:',
            fields: [
                { name: 'Streak Streak', value: 'When enabled, users get bonus streaks for maintaining daily streaks. This encourages consistent participation.' },
                { name: 'Trigger Words', value: 'Words that users need to say to increase their streak count. You can add multiple words and customize their descriptions.' }
            ]
        },
        raid: {
            title: '⚔️ Raid System Help',
            description: 'Here\'s what each setting does:',
            fields: [
                { name: 'Status', value: 'Enable or disable the raid feature for your server.' },
                { name: 'Max Steal', value: 'Maximum percentage of streaks that can be stolen in a successful raid (1-100%).' },
                { name: 'Risk', value: 'Percentage of streaks risked when a raid fails (1-100%).' },
                { name: 'Success Chance', value: 'Probability of a successful raid (1-100%).' },
                { name: 'Cooldown', value: 'Hours between raids (1-168). This prevents spam and abuse.' }
            ]
        },
        gambling: {
            title: '🎲 Gambling System Help',
            description: 'Here\'s what each setting does:',
            fields: [
                { name: 'Status', value: 'Enable or disable the gambling feature for your server.' },
                { name: 'Success Chance', value: 'Probability of winning a gamble (1-100%).' },
                { name: 'Max Gamble', value: 'Maximum percentage of streaks that can be gambled (1-100%).' },
                { name: 'Min Streaks', value: 'Minimum number of streaks required to gamble.' }
            ]
        }
    };

    const helpEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(helpTexts[section].title)
        .setDescription(helpTexts[section].description)
        .addFields(helpTexts[section].fields)
        .setFooter({ text: 'Click the back button to return to configuration' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`back_to_${section}`)
                .setLabel('Back to Configuration')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
        );

    await interaction.update({
        embeds: [helpEmbed],
        components: [row]
    });
} 