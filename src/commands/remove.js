const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a trigger word')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to remove')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const word = interaction.options.getString('word').toLowerCase();
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);

            if (!triggerWords || !triggerWords.includes(word)) {
                await interaction.editReply({
                    content: `❌ The word "${word}" is not a trigger word.`,
                    ephemeral: true
                });
                return;
            }

            await streakManager.removeTriggerWord(interaction.guildId, word);
            await interaction.editReply({
                content: `✅ Successfully removed "${word}" as a trigger word.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error removing trigger word:', error);
            await interaction.editReply({
                content: '❌ An error occurred while removing the trigger word.',
                ephemeral: true
            });
        }
    },
};
