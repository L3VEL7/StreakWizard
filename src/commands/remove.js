const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a trigger word from streak tracking')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to remove')
                .setRequired(true)),

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

            const word = interaction.options.getString('word').trim().toLowerCase();

            // Validate input
            if (!word || word.trim().length === 0) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid trigger word.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Check if word exists
            if (!await streakManager.isValidTriggerWord(interaction.guildId, word)) {
                return await interaction.editReply({
                    content: '❌ This trigger word does not exist in this server.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Get word stats before removal
            const wordStats = await streakManager.getWordStats(interaction.guildId, word);
            
            // Show warning message
            const warningMessage = '⚠️ **Warning:** Removing this trigger word will:\n' +
                `• Remove "${word}" from the list of valid trigger words\n` +
                `• Preserve all existing streak data\n` +
                `• Users will no longer be able to get streaks for this word\n\n` +
                `Current stats for "${word}":\n` +
                `• Active users: ${wordStats.activeUsers}\n` +
                `• Total streaks: ${wordStats.totalStreaks}\n\n` +
                'Are you sure you want to remove this trigger word?';

            await interaction.editReply({
                content: warningMessage,
                flags: [InteractionResponseFlags.Ephemeral]
            });

            // Wait for confirmation
            const filter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await interaction.channel.awaitMessageComponent({
                    filter,
                    time: 30000,
                    componentType: 2 // Button component
                });

                if (confirmation.customId === 'confirm') {
                    // Remove the trigger word
                    await streakManager.removeTriggerWord(interaction.guildId, word);

                    // Create success message
                    const message = `✅ Successfully removed the trigger word "${word}"!\n\n` +
                        `Note: All streak data has been preserved. Users will no longer be able to get streaks for this word.`;

                    await interaction.editReply(message);
                } else {
                    await interaction.editReply({
                        content: '❌ Operation cancelled.',
                        flags: [InteractionResponseFlags.Ephemeral]
                    });
                }
            } catch (error) {
                await interaction.editReply({
                    content: '❌ No confirmation received. Operation cancelled.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

        } catch (error) {
            console.error('Error in remove command:', error);
            const errorMessage = error.message || 'An error occurred while removing the trigger word.';
            
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
