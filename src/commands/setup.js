const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure trigger words for streak tracking')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to add')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of what this trigger word represents')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const word = interaction.options.getString('word').toLowerCase();
        const description = interaction.options.getString('description');

        try {
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            
            if (triggerWords.some(tw => tw.trigger === word)) {
                return await interaction.reply({
                    content: '❌ This trigger word already exists!',
                    ephemeral: true
                });
            }

            await streakManager.addTriggerWord(interaction.guildId, word, description);
            
            await interaction.reply({
                content: `✅ Added trigger word "${word}" with description: ${description}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error adding trigger word:', error);
            await interaction.reply({
                content: '❌ An error occurred while adding the trigger word.',
                ephemeral: true
            });
        }
    },
};