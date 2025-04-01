const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your streak profile')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view profile for (defaults to yourself)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            
            if (!triggerWords || triggerWords.length === 0) {
                await interaction.editReply({
                    content: '❌ No trigger words have been set up yet.',
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${targetUser.username}'s Streak Profile`)
                .setThumbnail(targetUser.displayAvatarURL());

            for (const word of triggerWords) {
                const streak = await streakManager.getStreak(interaction.guildId, targetUser.id, word);
                const streakStreak = await streakManager.getStreakStreak(interaction.guildId, targetUser.id, word);
                
                let streakInfo = `Current Streak: ${streak || 0}`;
                if (streakStreak > 1) {
                    streakInfo += `\nStreak Streak: ${streakStreak} days`;
                }
                
                embed.addFields({ name: `📝 ${word}`, value: streakInfo });
            }

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error showing profile:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the profile.',
                ephemeral: true
            });
        }
    },
}; 