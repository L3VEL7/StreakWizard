const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gamble a percentage of your streak on a coin flip')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to gamble with')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('percentage')
                .setDescription('Percentage of your streak to gamble (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Choose heads or tails')
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
                    content: '❌ Gambling is not enabled in this server. Ask an administrator to enable it.',
                    ephemeral: true
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply();

            const word = interaction.options.getString('word');
            const percentage = interaction.options.getInteger('percentage');
            const choice = interaction.options.getString('choice');

            // Enhanced input validation
            if (!word || word.trim().length === 0) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid trigger word.',
                    ephemeral: true
                });
            }

            if (percentage < 1 || percentage > 100) {
                return await interaction.editReply({
                    content: '❌ Percentage must be between 1 and 100.',
                    ephemeral: true
                });
            }

            if (!['heads', 'tails'].includes(choice)) {
                return await interaction.editReply({
                    content: '❌ Invalid choice. Please select either heads or tails.',
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
            const targetStreak = userStreaks.find(s => s.trigger === word.trim().toLowerCase());
            
            if (!targetStreak || targetStreak.count < 2) {
                return await interaction.editReply({
                    content: '❌ You need at least 2 streaks to gamble.',
                    ephemeral: true
                });
            }

            // Perform the gamble
            const result = await streakManager.gambleStreak(
                interaction.guildId,
                interaction.user.id,
                word,
                percentage,
                choice
            );

            // Create response message
            const emoji = result.won ? '🎉' : '💀';
            const status = result.won ? 'WON' : 'LOST';
            const message = `${emoji} **GAMBLE RESULT** ${emoji}\n` +
                `You ${status} ${result.gambleAmount} streaks!\n` +
                `Coin landed on: ${result.result}\n` +
                `Your new streak for "${word}": ${result.newCount}`;

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