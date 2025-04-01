const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset a user\'s streaks')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to reset (optional)')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        await interaction.deferReply({ flags: [InteractionResponseFlags.Ephemeral] });

        try {
            const targetUser = interaction.options.getUser('user');
            const word = interaction.options.getString('word')?.toLowerCase();

            if (word) {
                // Reset specific trigger word
                await streakManager.resetStreak(interaction.guildId, targetUser.id, word);
                await interaction.editReply({
                    content: `✅ Reset ${targetUser.username}'s streak for "${word}" to 0.`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            } else {
                // Reset all trigger words
                const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
                for (const triggerWord of triggerWords) {
                    await streakManager.resetStreak(interaction.guildId, targetUser.id, triggerWord);
                }
                await interaction.editReply({
                    content: `✅ Reset all streaks for ${targetUser.username} to 0.`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }
        } catch (error) {
            console.error('Error resetting streaks:', error);
            await interaction.editReply({
                content: '❌ An error occurred while resetting the streaks.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }
    },
}; 