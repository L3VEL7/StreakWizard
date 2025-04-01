const { SlashCommandBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gamble a percentage of your streaks on a coin flip')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to gamble')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('percentage')
                .setDescription('Percentage of streaks to gamble (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Your choice (heads or tails)')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                )),

    async execute(interaction) {
        try {
            // Check if gambling is enabled
            const gamblingEnabled = await streakManager.isGamblingEnabled(interaction.guildId);
            if (!gamblingEnabled) {
                return await interaction.reply({
                    content: '❌ Gambling feature is not enabled in this server. Ask an administrator to enable it.',
                    ephemeral: true
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply({ ephemeral: true });

            const word = interaction.options.getString('word').trim().toLowerCase();
            const percentage = interaction.options.getInteger('percentage');
            const choice = interaction.options.getString('choice');

            // Enhanced input validation
            if (!word || word.trim().length === 0) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid trigger word.',
                    ephemeral: true
                });
            }

            // Validate trigger word
            if (!await streakManager.isValidTriggerWord(interaction.guildId, word)) {
                return await interaction.editReply({
                    content: '❌ Invalid trigger word. Please use a word that is set up for streaks in this server.',
                    ephemeral: true
                });
            }

            // Check if user has enough streaks to gamble
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, interaction.user.id);
            const userStreak = userStreaks.find(s => s.trigger === word.trim().toLowerCase());
            
            if (!userStreak || userStreak.count < 2) {
                return await interaction.editReply({
                    content: '❌ You need at least 2 streaks to gamble.',
                    ephemeral: true
                });
            }

            // Get gambling configuration
            const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);

            // Perform the gamble
            const result = await streakManager.gambleStreak(
                interaction.guildId,
                interaction.user.id,
                word,
                percentage,
                choice
            );

            // Create response message
            const emoji = result.success ? '🎲' : '💀';
            const status = result.success ? 'WON' : 'LOST';
            const message = `${emoji} **GAMBLE RESULT** ${emoji}\n` +
                `You ${status}!\n` +
                `Gambled ${percentage}% (${result.gambleAmount} streaks)\n` +
                `Your new streak: ${result.newCount}`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in gamble command:', error);
            const errorMessage = error.message || 'An error occurred while processing your gamble.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    }
}; 