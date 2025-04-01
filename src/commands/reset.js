const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset a user\'s streak count')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset streaks for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to reset (leave empty to reset all)')
                .setRequired(false)),

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

            const targetUser = interaction.options.getUser('user');
            const word = interaction.options.getString('word')?.trim().toLowerCase();

            // Validate target user
            if (targetUser.bot) {
                return await interaction.editReply({
                    content: '❌ You cannot reset streaks for bots.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Reset streaks
            if (word) {
                // Reset specific word
                if (!await streakManager.isValidTriggerWord(interaction.guildId, word)) {
                    return await interaction.editReply({
                        content: '❌ Invalid trigger word. Please use a word that is set up for streaks in this server.',
                        flags: [InteractionResponseFlags.Ephemeral]
                    });
                }

                await streakManager.resetUserStreak(interaction.guildId, targetUser.id, word);
                
                // Create response message
                const message = `✅ Reset ${targetUser}'s streak for "${word}" to 0.`;
                await interaction.editReply(message);
            } else {
                // Reset all words
                await streakManager.resetAllUserStreaks(interaction.guildId, targetUser.id);
                
                // Create response message
                const message = `✅ Reset all of ${targetUser}'s streaks to 0.`;
                await interaction.editReply(message);
            }

        } catch (error) {
            console.error('Error in reset command:', error);
            const errorMessage = error.message || 'An error occurred while resetting streaks.';
            
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