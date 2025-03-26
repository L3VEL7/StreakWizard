const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View server-wide streak statistics'),

    async execute(interaction) {
        await interaction.deferReply();
        
        const guildId = interaction.guildId;

        try {
            const stats = await streakManager.getServerStats(guildId);
            
            if (!stats || stats.length === 0) {
                return await interaction.editReply({
                    content: 'No streak statistics available for this server yet!',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('📊 Server Streak Statistics')
                .setDescription(`Total Active Streaks: ${stats.reduce((acc, curr) => acc + curr.active_users, 0)}`)
                .addFields(
                    stats.map(stat => ({
                        name: `${stat.trigger} 🔥`,
                        value: `Active Users: ${stat.active_users}\nTotal Streaks: ${stat.total_streaks}\nAverage Streak: ${Math.round(stat.average_streak)}`,
                        inline: true
                    }))
                )
                .setFooter({ text: `Last updated: ${new Date().toLocaleString()}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching server stats:', error);
            await interaction.editReply({
                content: 'There was an error fetching the statistics!',
                ephemeral: true
            });
        }
    },
}; 