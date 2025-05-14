const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');
const { Streak } = require('../database/models');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset streaks')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Reset a specific user\'s streaks')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user to reset')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The trigger word to reset (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trigger')
                .setDescription('Delete all users\' streaks for a specific trigger word (complete reset)')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The trigger word to reset')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm that you want to completely delete all streaks (not just reset them to 0)')
                        .setRequired(true))),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            
            console.log(`/reset command used by ${interaction.user.tag} (${interaction.user.id}) with subcommand: ${subcommand}`);

            if (!triggerWords || triggerWords.length === 0) {
                return await interaction.editReply({
                    content: '❌ No trigger words are configured for this server.',
                    ephemeral: true
                });
            }

            if (subcommand === 'user') {
                const targetUser = interaction.options.getUser('target');
                if (!targetUser) {
                    return await interaction.editReply({
                        content: '❌ Could not find the specified user.',
                        ephemeral: true
                    });
                }

                const word = interaction.options.getString('word');
                if (word) {
                    const lowercaseWord = word.toLowerCase();
                    if (!triggerWords.includes(lowercaseWord)) {
                        return await interaction.editReply({
                            content: `❌ "${word}" is not a configured trigger word.`,
                            ephemeral: true
                        });
                    }

                    // Reset specific trigger word for user
                    await streakManager.resetStreak(interaction.guildId, targetUser.id, lowercaseWord);
                    await interaction.editReply({
                        content: `✅ Reset ${targetUser.username}'s streak for "${word}" to 0.`,
                        ephemeral: true
                    });
                } else {
                    // Reset all trigger words for user
                    for (const triggerWord of triggerWords) {
                        await streakManager.resetStreak(interaction.guildId, targetUser.id, triggerWord);
                    }
                    await interaction.editReply({
                        content: `✅ Reset all streaks for ${targetUser.username} to 0.`,
                        ephemeral: true
                    });
                }
            } else if (subcommand === 'trigger') {
                const word = interaction.options.getString('word');
                if (!word) {
                    return await interaction.editReply({
                        content: '❌ Please provide a trigger word to reset.',
                        ephemeral: true
                    });
                }

                const confirm = interaction.options.getBoolean('confirm');
                if (!confirm) {
                    return await interaction.editReply({
                        content: '❌ You must confirm the deletion by setting the confirm option to true.',
                        ephemeral: true
                    });
                }

                const lowercaseWord = word.toLowerCase();
                if (!triggerWords.includes(lowercaseWord)) {
                    return await interaction.editReply({
                        content: `❌ "${word}" is not a configured trigger word.`,
                        ephemeral: true
                    });
                }

                console.log(`/reset trigger: Deleting all streaks for word "${lowercaseWord}" in guild ${interaction.guildId}`);
                
                // CHANGED: Instead of resetting streaks to 0, delete them completely from the database
                try {
                    // Delete all streak records for this trigger word
                    const deletedCount = await Streak.destroy({
                        where: {
                            guildId: interaction.guildId,
                            triggerWord: lowercaseWord
                        }
                    });
                    
                    console.log(`/reset trigger: Deleted ${deletedCount} streak records for word "${lowercaseWord}"`);
                    
                    if (deletedCount === 0) {
                        return await interaction.editReply({
                            content: `ℹ️ No users had streaks for "${word}" to delete.`,
                            ephemeral: true
                        });
                    }

                    await interaction.editReply({
                        content: `✅ Successfully deleted all ${deletedCount} streak records for "${word}".\n` +
                                 `Users can now start fresh with this trigger word.`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error deleting streaks:', error);
                    await interaction.editReply({
                        content: `❌ An error occurred while deleting the streaks: ${error.message}`,
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('Error resetting streaks:', error);
            await interaction.editReply({
                content: '❌ An error occurred while resetting the streaks.',
                ephemeral: true
            });
        }
    }
}; 