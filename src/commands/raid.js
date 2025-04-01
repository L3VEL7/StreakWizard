const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Attempt to steal streaks from another user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to raid')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const targetUser = interaction.options.getUser('target');
            const userId = interaction.user.id;
            const guildId = interaction.guildId;

            // Check if raid is enabled
            const raidConfig = await streakManager.getRaidConfig(guildId);
            if (!raidConfig.enabled) {
                return await interaction.editReply({
                    content: '❌ Raids are currently disabled in this server.',
                    ephemeral: true
                });
            }

            // Check cooldown
            const lastRaid = await streakManager.getLastRaidTime(guildId, userId);
            if (lastRaid && Date.now() - lastRaid < raidConfig.cooldownHours * 3600000) {
                const remainingTime = Math.ceil((raidConfig.cooldownHours * 3600000 - (Date.now() - lastRaid)) / 3600000);
                return await interaction.editReply({
                    content: `❌ You must wait ${remainingTime} more hour(s) before raiding again.`,
                    ephemeral: true
                });
            }

            // Get target's streaks
            const targetStreaks = await streakManager.getUserStreaks(guildId, targetUser.id);
            if (!targetStreaks || targetStreaks.length === 0) {
                return await interaction.editReply({
                    content: '❌ This user has no streaks to steal.',
                    ephemeral: true
                });
            }

            // Calculate steal amount
            const totalStreaks = targetStreaks.reduce((sum, streak) => sum + streak.count, 0);
            const stealAmount = Math.floor(totalStreaks * (raidConfig.maxStealPercent / 100));

            // Calculate success
            const success = Math.random() * 100 < raidConfig.successChance;

            if (success) {
                // Successful raid
                await streakManager.updateUserStreak(guildId, userId, 'raiding', stealAmount);
                await streakManager.updateUserStreak(guildId, targetUser.id, 'raided', -stealAmount);
                await streakManager.updateLastRaidTime(guildId, userId);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('⚔️ Raid Successful!')
                    .setDescription(`You stole ${stealAmount} streaks from ${targetUser.username}!`)
                    .addFields(
                        { name: 'Stolen Streaks', value: `+${stealAmount}`, inline: true },
                        { name: 'Success Chance', value: `${raidConfig.successChance}%`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [embed],
                    ephemeral: true
                });
            } else {
                // Failed raid
                const riskAmount = Math.floor(totalStreaks * (raidConfig.riskPercent / 100));
                await streakManager.updateUserStreak(guildId, userId, 'raiding', -riskAmount);
                await streakManager.updateLastRaidTime(guildId, userId);

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('💥 Raid Failed!')
                    .setDescription(`Your raid on ${targetUser.username} failed!`)
                    .addFields(
                        { name: 'Lost Streaks', value: `-${riskAmount}`, inline: true },
                        { name: 'Success Chance', value: `${raidConfig.successChance}%`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in raid:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your raid.',
                ephemeral: true
            });
        }
    },
}; 