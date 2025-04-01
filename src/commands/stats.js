const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your streak statistics'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        try {
            const userStreaks = await streakManager.getUserStreaks(guildId, userId);
            const totalStreaks = userStreaks.reduce((sum, streak) => sum + streak.count, 0);
            const streakStreak = await streakManager.getStreakStreak(guildId, userId);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('📊 Your Streak Statistics')
                .setDescription(`Total Streaks: ${totalStreaks}`)
                .addFields(
                    { name: 'Current Streak Streak', value: `${streakStreak || 0} days`, inline: true },
                    { name: 'Active Streaks', value: `${userStreaks.length} different words`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error fetching user stats:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching your statistics.',
                ephemeral: true
            });
        }
    },
}; 