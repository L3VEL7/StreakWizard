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

            // Get all user streaks at once
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, targetUser.id);
            
            // Create a map for easy lookup
            const streaksMap = {};
            userStreaks.forEach(streak => {
                streaksMap[streak.trigger] = streak;
            });

            // Create profile fields for each trigger word
            for (const word of triggerWords) {
                const userStreak = streaksMap[word];
                const count = userStreak ? userStreak.count : 0;
                
                let streakInfo = `Current Streak: ${count}`;
                
                // Check if the streak record has streakStreak information
                // We'll need to query the database directly since getUserStreaks doesn't return this
                try {
                    // We need to use findOne directly to get the streakStreak information
                    const { Streak } = require('../database/models');
                    const streakRecord = await Streak.findOne({
                        where: {
                            guildId: interaction.guildId,
                            userId: targetUser.id,
                            triggerWord: word
                        }
                    });
                    
                    if (streakRecord && streakRecord.streakStreak > 1) {
                        streakInfo += `\nStreak Streak: ${streakRecord.streakStreak} days`;
                    }
                } catch (err) {
                    console.error('Error fetching streak streak:', err);
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