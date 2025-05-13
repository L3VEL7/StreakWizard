const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

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
                .setDescription('Reset all users\' streaks for a specific trigger word')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The trigger word to reset')
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

                const lowercaseWord = word.toLowerCase();
                if (!triggerWords.includes(lowercaseWord)) {
                    return await interaction.editReply({
                        content: `❌ "${word}" is not a configured trigger word.`,
                        ephemeral: true
                    });
                }

                // Get all users with streaks for this word
                const users = await streakManager.getUsersWithStreaks(interaction.guildId, lowercaseWord);
                
                if (!users || users.length === 0) {
                    return await interaction.editReply({
                        content: `ℹ️ No users have streaks for "${word}".`,
                        ephemeral: true
                    });
                }

                // Reset streaks for all users
                let resetCount = 0;
                for (const userId of users) {
                    const result = await streakManager.resetStreak(interaction.guildId, userId, lowercaseWord);
                    if (result.success) {
                        resetCount++;
                    }
                }

                await interaction.editReply({
                    content: `✅ Reset "${word}" streaks for ${resetCount} users to 0.`,
                    ephemeral: true
                });
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