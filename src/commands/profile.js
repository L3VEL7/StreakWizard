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
            
            // Use specialized function to get trigger words with fallbacks
            const triggerWords = await streakManager.getTriggerWordsForProfile(interaction.guildId);
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${targetUser.username}'s Streak Profile`)
                .setThumbnail(targetUser.displayAvatarURL());

            // Get all user streaks at once - try our specialized function
            const userStreaks = await streakManager.getUserStreaksForGambling(interaction.guildId, targetUser.id);
            
            // Create a map for easy lookup
            const streaksMap = {};
            userStreaks.forEach(streak => {
                streaksMap[streak.trigger] = streak;
            });

            // If we have no trigger words but we have streaks, use the streak trigger words
            if ((!triggerWords || triggerWords.length === 0) && userStreaks.length > 0) {
                const streakTriggers = [...new Set(userStreaks.map(s => s.trigger))];
                
                if (streakTriggers.length > 0) {
                    // Save these for future use
                    try {
                        await streakManager.setTriggerWords(interaction.guildId, streakTriggers);
                    } catch (saveError) {
                        console.error('Error saving recovered trigger words:', saveError);
                    }
                    
                    // Use these triggers for the profile
                    for (const word of streakTriggers) {
                        const userStreak = streaksMap[word];
                        const count = userStreak ? userStreak.count : 0;
                        embed.addFields({ name: `📝 ${word}`, value: `Current Streak: ${count}` });
                    }
                    
                    await interaction.editReply({ embeds: [embed], ephemeral: true });
                    return;
                }
            }
            
            // If still no trigger words, show a message but don't fail
            if (!triggerWords || triggerWords.length === 0) {
                embed.setDescription('No trigger words have been set up yet.');
                if (interaction.member.permissions.has('ADMINISTRATOR')) {
                    embed.addFields({ 
                        name: 'Admin Tip', 
                        value: 'Use `/setup word:keyword` to add trigger words for your server.' 
                    });
                }
                await interaction.editReply({ embeds: [embed], ephemeral: true });
                return;
            }

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
                        },
                        attributes: ['id', 'streakStreak', 'triggerWord', 'count', 'bestStreak']
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