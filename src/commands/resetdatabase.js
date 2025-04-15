const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GuildConfig, Streak, RaidHistory } = require('../database/models');
const sequelize = require('../database/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetdatabase')
        .setDescription('Reset database tables (ADMIN ONLY - THIS DELETES DATA)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('table')
                .setDescription('Which table to reset')
                .setRequired(true)
                .addChoices(
                    { name: 'All Streaks', value: 'streaks' },
                    { name: 'Guild Configuration', value: 'config' },
                    { name: 'Raid History', value: 'raids' },
                    { name: 'Everything (DANGER!)', value: 'all' }
                ))
        .addStringOption(option =>
            option.setName('confirmation')
                .setDescription('Type CONFIRM (all caps) to confirm this destructive action')
                .setRequired(true)),
    
    async execute(interaction) {
        // Double check permissions
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need Administrator permissions to use this command.',
                ephemeral: true
            });
        }
        
        const table = interaction.options.getString('table');
        const confirmation = interaction.options.getString('confirmation');
        
        if (confirmation !== 'CONFIRM') {
            return await interaction.reply({
                content: '❌ Action cancelled. You must type CONFIRM (all caps) in the confirmation field.',
                ephemeral: true
            });
        }
        
        // Extra confirmation with buttons for this destructive action
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_reset')
                    .setLabel('YES, RESET DATA')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_reset')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        let warningMessage;
        switch (table) {
            case 'streaks':
                warningMessage = '⚠️ **WARNING!** You are about to DELETE ALL STREAKS for everyone in this server. This cannot be undone!';
                break;
            case 'config':
                warningMessage = '⚠️ **WARNING!** You are about to DELETE ALL SERVER CONFIGURATIONS including trigger words, raid settings, and gambling settings. This cannot be undone!';
                break;
            case 'raids':
                warningMessage = '⚠️ **WARNING!** You are about to DELETE ALL RAID HISTORY including cooldowns. This cannot be undone!';
                break;
            case 'all':
                warningMessage = '⚠️ **EXTREME WARNING!** You are about to DELETE ALL BOT DATA for this server including streaks, configurations, and raid history. THIS CANNOT BE UNDONE!';
                break;
            default:
                return await interaction.reply({
                    content: '❌ Invalid table selection.',
                    ephemeral: true
                });
        }
        
        const response = await interaction.reply({
            content: `${warningMessage}\n\nAre you absolutely sure you want to proceed?`,
            components: [confirmRow],
            ephemeral: true
        });
        
        // Create a collector for the confirmation buttons
        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 30000 // 30 seconds timeout
        });
        
        // Handle button interactions
        collector.on('collect', async i => {
            // Remove the buttons
            await i.update({
                components: []
            });
            
            if (i.customId === 'cancel_reset') {
                await i.editReply({
                    content: '✅ Database reset cancelled. No data was deleted.',
                    ephemeral: true
                });
                return;
            }
            
            if (i.customId === 'confirm_reset') {
                await i.editReply({
                    content: '🔄 Processing database reset... Please wait.',
                    ephemeral: true
                });
                
                try {
                    let deleteCount = 0;
                    
                    // Use a transaction for data consistency
                    const transaction = await sequelize.transaction();
                    
                    try {
                        // Delete data based on the selected table
                        switch (table) {
                            case 'streaks':
                                deleteCount = await Streak.destroy({
                                    where: { guildId: interaction.guildId },
                                    transaction
                                });
                                break;
                                
                            case 'config':
                                deleteCount = await GuildConfig.destroy({
                                    where: { guildId: interaction.guildId },
                                    transaction
                                });
                                break;
                                
                            case 'raids':
                                deleteCount = await RaidHistory.destroy({
                                    where: { guildId: interaction.guildId },
                                    transaction
                                });
                                break;
                                
                            case 'all':
                                // Delete all tables for this guild
                                const streaksDeleted = await Streak.destroy({
                                    where: { guildId: interaction.guildId },
                                    transaction
                                });
                                
                                const configDeleted = await GuildConfig.destroy({
                                    where: { guildId: interaction.guildId },
                                    transaction
                                });
                                
                                const raidsDeleted = await RaidHistory.destroy({
                                    where: { guildId: interaction.guildId },
                                    transaction
                                });
                                
                                deleteCount = streaksDeleted + configDeleted + raidsDeleted;
                                break;
                        }
                        
                        // Commit the transaction
                        await transaction.commit();
                        
                        await i.editReply({
                            content: `✅ Database reset complete! ${deleteCount} records were deleted.\n\nIf you deleted the configuration, use /setup-embed to set up the bot again.`,
                            ephemeral: true
                        });
                    } catch (error) {
                        // If there's an error, rollback the transaction
                        await transaction.rollback();
                        throw error;
                    }
                } catch (error) {
                    console.error('Error resetting database:', error);
                    await i.editReply({
                        content: `❌ An error occurred while resetting the database: ${error.message}`,
                        ephemeral: true
                    });
                }
            }
        });
        
        // Handle timeout
        collector.on('end', async collected => {
            if (collected.size === 0) {
                await interaction.editReply({
                    content: '⏰ Confirmation timed out. Database reset cancelled.',
                    components: [],
                    ephemeral: true
                });
            }
        });
    }
}; 