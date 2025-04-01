const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your streak profile or another user\'s profile')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view the profile of')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guildId;

        try {
            const userStreaks = await streakManager.getUserStreaks(guildId, targetUser.id);
            
            if (!userStreaks || userStreaks.length === 0) {
                return await interaction.editReply({
                    content: `${targetUser.username} hasn't earned any streaks yet!`,
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle(`${targetUser.username}'s Streak Profile`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`Total Streaks: ${userStreaks.length}`)
                .addFields(
                    userStreaks.map(streak => ({
                        name: `${streak.trigger} 🔥`,
                        value: `Current Streak: ${streak.count}\nBest Streak: ${streak.best_streak || streak.count}`,
                        inline: true
                    }))
                )
                .setFooter({ text: `Member since ${targetUser.createdAt.toLocaleDateString()}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching your profile.',
                ephemeral: true
            });
        }
    },
}; 