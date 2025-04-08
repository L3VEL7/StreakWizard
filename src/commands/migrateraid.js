const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('migrateraid')
        .setDescription('Migrate raid data from old format to new format')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guildId = interaction.guildId;
            
            await interaction.editReply({
                content: '⏳ Migrating raid data... This may take a moment.',
                ephemeral: true
            });
            
            // Run the migration
            const migratedCount = await streakManager.migrateRaidData(guildId);
            
            if (migratedCount > 0) {
                await interaction.editReply({
                    content: `✅ Successfully migrated ${migratedCount} raid records to the new format.`,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: '⚠️ No raid data needed to be migrated or no data was found.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error migrating raid data:', error);
            await interaction.editReply({
                content: `❌ An error occurred while migrating raid data: ${error.message}`,
                ephemeral: true
            });
        }
    }
}; 