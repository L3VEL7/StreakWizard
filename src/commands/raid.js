const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Attempt to steal streaks from another user')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to raid')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to raid')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Check if raid is enabled
            const raidEnabled = await streakManager.isRaidEnabled(interaction.guildId);
            if (!raidEnabled) {
                return await interaction.reply({
                    content: '❌ Raid feature is not enabled in this server. Ask an administrator to enable it.',
                    ephemeral: true
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply();

            const word = interaction.options.getString('word');
            const target = interaction.options.getUser('target');

            // Enhanced input validation
            if (!word || word.trim().length === 0) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid trigger word.',
                    ephemeral: true
                });
            }

            // Prevent self-raiding
            if (target.id === interaction.user.id) {
                return await interaction.editReply({
                    content: '❌ You cannot raid yourself!',
                    ephemeral: true
                });
            }

            // Prevent raiding bots
            if (target.bot) {
                return await interaction.editReply({
                    content: '❌ You cannot raid bots!',
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

            // Check if user has enough streaks to raid
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, interaction.user.id);
            const targetStreaks = await streakManager.getUserStreaks(interaction.guildId, target.id);
            
            const userStreak = userStreaks.find(s => s.trigger === word.trim().toLowerCase());
            const targetStreak = targetStreaks.find(s => s.trigger === word.trim().toLowerCase());
            
            if (!userStreak || userStreak.count < 2) {
                return await interaction.editReply({
                    content: '❌ You need at least 2 streaks to raid.',
                    ephemeral: true
                });
            }

            if (!targetStreak || targetStreak.count < 2) {
                return await interaction.editReply({
                    content: '❌ Target has no streak to raid.',
                    ephemeral: true
                });
            }

            // Get raid configuration
            const raidConfig = await streakManager.getRaidConfig(interaction.guildId);

            // Perform the raid
            const result = await streakManager.raidStreak(
                interaction.guildId,
                interaction.user.id,
                target.id,
                word
            );

            // Create response message
            const emoji = result.success ? '⚔️' : '🛡️';
            const status = result.success ? 'SUCCESSFUL' : 'FAILED';
            const message = `${emoji} **RAID RESULT** ${emoji}\n` +
                `Raid ${status}!\n` +
                `Attempted to steal ${result.stealPercent}% (${result.stealAmount} streaks)\n` +
                `Risked ${raidConfig.riskPercent}% (${result.riskAmount} streaks)\n\n` +
                `Your new streak: ${result.attackerNewCount}\n` +
                `${target.username}'s new streak: ${result.defenderNewCount}`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in raid command:', error);
            const errorMessage = error.message || 'An error occurred while processing your raid.';
            
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