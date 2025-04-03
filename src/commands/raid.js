const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Attempt to steal streaks from another user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to raid')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to raid')
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const word = interaction.options.getString('word').toLowerCase();

        if (target.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ You cannot raid yourself!',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: false });

        try {
            // Check if raid system is enabled
            const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
            if (!raidConfig || !raidConfig.enabled) {
                await interaction.editReply({
                    content: '❌ The raid system is currently disabled in this server.',
                    ephemeral: false
                });
                return;
            }

            // Check for cooldown
            const cooldownInfo = await streakManager.getRemainingRaidTime(interaction.guildId, interaction.user.id);
            if (!cooldownInfo.canRaid) {
                const cooldownType = cooldownInfo.wasSuccessful ? 'successful' : 'failed';
                await interaction.editReply({
                    content: `⏳ You must wait ${cooldownInfo.remainingHours}h ${cooldownInfo.remainingMinutes}m before raiding again.\n(Cooldown after a ${cooldownType} raid: ${cooldownInfo.wasSuccessful ? raidConfig.successCooldownHours : raidConfig.failureCooldownHours} hours)`,
                    ephemeral: false
                });
                return;
            }

            // Check if user has enough streaks to raid
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, interaction.user.id);
            const userStreak = userStreaks.find(s => s.trigger === word);
            if (!userStreak || userStreak.count < 2) {
                await interaction.editReply({
                    content: '❌ You need at least 2 streaks to raid.',
                    ephemeral: false
                });
                return;
            }

            // Check if target has enough streaks to be raided
            const targetStreaks = await streakManager.getUserStreaks(interaction.guildId, target.id);
            const targetStreak = targetStreaks.find(s => s.trigger === word);
            if (!targetStreak || targetStreak.count < 2) {
                await interaction.editReply({
                    content: `❌ ${target} doesn't have enough streaks to raid.`,
                    ephemeral: false
                });
                return;
            }

            // Perform the raid
            const result = await streakManager.raidStreak(
                interaction.guildId,
                interaction.user.id,
                target.id,
                word
            );

            if (result.success) {
                await interaction.editReply({
                    content: `⚔️ **RAID SUCCESSFUL!** ⚔️\n${interaction.user} raided ${target} and stole ${result.stealAmount} "${word}" streaks!\n${interaction.user}'s new streak: ${result.attackerNewCount}\n${target}'s new streak: ${result.defenderNewCount}\n\n⏳ Cooldown: ${raidConfig.successCooldownHours} hours`,
                    ephemeral: false
                });
            } else {
                await interaction.editReply({
                    content: `💀 **RAID FAILED!** 💀\n${interaction.user} tried to raid ${target} but failed and lost ${result.riskAmount} "${word}" streaks!\n${target} gained ${result.riskAmount} streaks as a defense bonus!\n${interaction.user}'s new streak: ${result.attackerNewCount}\n${target}'s new streak: ${result.defenderNewCount}\n\n⏳ Cooldown: ${raidConfig.failureCooldownHours} hours`,
                    ephemeral: false
                });
            }
        } catch (error) {
            console.error('Error in raid command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your raid.',
                ephemeral: false
            });
        }
    },
}; 