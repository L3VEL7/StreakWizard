const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');
const { Streak, GuildConfig } = require('../database/models');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetdata')
        .setDescription('Reset all streaks and trigger words for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('confirm')
                .setDescription('Confirm that you want to reset all data')
                .setRequired(true)),

    async execute(interaction) {
        console.log(`/resetdata command used by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guild.name} (${interaction.guildId})`);
        
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            console.log(`/resetdata: Permission denied for ${interaction.user.tag}`);
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const confirm = interaction.options.getBoolean('confirm');
        console.log(`/resetdata: Confirm value is ${confirm}`);
        
        if (!confirm) {
            return await interaction.reply({
                content: '⚠️ Please confirm that you want to reset all data by setting the confirm option to true.',
                ephemeral: true
            });
        }

        // Use a direct reply to start
        await interaction.reply({
            content: '🔄 Processing data reset request...',
            ephemeral: true
        });

        try {
            console.log('/resetdata: Getting current stats and trigger words');
            // Get current stats before reset
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            const stats = await streakManager.getStats(interaction.guildId);
            
            console.log(`/resetdata: Current stats - Streaks: ${stats.totalStreaks}, Users: ${stats.uniqueUsers}, Words: ${triggerWords.length}`);

            // Delete all streaks for this guild
            console.log('/resetdata: Deleting streaks');
            const deletedStreaks = await Streak.destroy({
                where: {
                    guildId: interaction.guildId
                }
            });
            console.log(`/resetdata: Deleted ${deletedStreaks} streaks`);

            // Reset trigger words
            console.log('/resetdata: Resetting trigger words');
            const updatedConfig = await GuildConfig.update(
                { triggerWords: [] },
                { where: { guildId: interaction.guildId } }
            );
            console.log(`/resetdata: Updated config rows: ${updatedConfig[0]}`);

            // Create response message
            let response = '✅ Successfully reset all data:\n';
            response += `- Removed ${stats.totalStreaks} total streaks\n`;
            response += `- Reset ${stats.uniqueUsers} users' streaks\n`;
            response += `- Removed ${triggerWords.length} trigger words: ${triggerWords.join(', ')}`;

            await interaction.editReply({
                content: response,
                ephemeral: true
            });
            
            console.log(`/resetdata: Successfully completed for guild ${interaction.guildId}`);
        } catch (error) {
            console.error('Error resetting data:', error);
            
            // Send a more detailed error message
            await interaction.editReply({
                content: `❌ An error occurred while resetting the data: ${error.message}`,
                ephemeral: true
            });
        }
    }
}; 