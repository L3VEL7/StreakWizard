const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');
const raidMessages = require('../data/raidMessages');

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

            // Check if the word is valid
            const isValidWord = await streakManager.isValidTriggerWord(interaction.guildId, word);
            if (!isValidWord) {
                await interaction.editReply({
                    content: `❌ "${word}" is not a valid trigger word in this server.`,
                    ephemeral: false
                });
                return;
            }

            // Let the user know we're checking raid conditions
            await interaction.editReply({
                content: `⚔️ Preparing to raid ${target}'s "${word}" streaks...\nPeeking over the castle walls...`,
                ephemeral: false
            });

            // Get user streaks for display
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, interaction.user.id);
            const targetStreaks = await streakManager.getUserStreaks(interaction.guildId, target.id);
            
            const attackerStreak = userStreaks.find(s => s.triggerWord === word || s.trigger === word);
            const targetStreak = targetStreaks.find(s => s.triggerWord === word || s.trigger === word);
            
            const attackerCount = attackerStreak ? attackerStreak.count : 0;
            const defenderCount = targetStreak ? targetStreak.count : 0;

            // Perform the raid using the new function
            let result = await streakManager.raidUserStreak(
                interaction.guildId,
                interaction.user.id,
                target.id,
                word
            );

            // If the raid couldn't be initiated due to pre-conditions
            if (!result.success) {
                // Double-check if this is a cooldown error and if cooldowns are disabled
                if (result.message.includes("raid cooldown") || result.message.includes("You can raid again")) {
                    // Get fresh raid config to ensure we have the latest settings
                    const freshConfig = await streakManager.getRaidConfig(interaction.guildId);
                    if (freshConfig.cooldownEnabled === false) {
                        // If cooldowns are disabled but we got a cooldown error, ignore it and retry
                        console.log('Cooldowns disabled but got cooldown error. Retrying raid...');
                        
                        // Force a raid bypass
                        const bypassResult = await streakManager.raidUserStreak(
                            interaction.guildId,
                            interaction.user.id,
                            target.id,
                            word,
                            true // Add this parameter to indicate a forced bypass
                        );
                        
                        if (bypassResult.success) {
                            // Continue with the bypassed result
                            result = bypassResult;
                        } else {
                            await interaction.editReply({
                                content: `❌ ${bypassResult.message}`,
                                ephemeral: false
                            });
                            return;
                        }
                    } else {
                        await interaction.editReply({
                            content: `❌ ${result.message}`,
                            ephemeral: false
                        });
                        return;
                    }
                } else {
                    await interaction.editReply({
                        content: `❌ ${result.message}`,
                        ephemeral: false
                    });
                    return;
                }
            }

            // Prepare data for narrative message
            const messageData = {
                attacker: interaction.user.username,
                defender: target.username,
                amount: result.raidSuccess ? result.stealAmount : result.riskAmount,
                word: word
            };

            // Get a random narrative message and format it
            const narrativeMessage = raidMessages.formatMessage(
                raidMessages.getRandomMessage(result.raidSuccess),
                messageData
            );

            // Determine success or failure of the raid
            if (result.raidSuccess) {
                // Successful raid
                const embed = new EmbedBuilder()
                    .setTitle('⚔️ RAID SUCCESSFUL! ⚔️')
                    .setColor(0x00FF00)
                    .setDescription(narrativeMessage)
                    .addFields(
                        { 
                            name: `${interaction.user.username}'s Streak`, 
                            value: `${result.attackerOldStreak} → **${result.attackerNewStreak}** (+${result.stealAmount})`, 
                            inline: true 
                        },
                        { 
                            name: `${target.username}'s Streak`, 
                            value: `${result.defenderOldStreak} → **${result.defenderNewStreak}** (-${result.stealAmount})`, 
                            inline: true 
                        },
                        {
                            name: 'Raid Difficulty',
                            value: getDifficultyDescription(result.difficultyAdjustment),
                            inline: false
                        },
                        { 
                            name: 'Raid Stats', 
                            value: `✅ Success chance: ${result.successChance.toFixed(1)}%\n🎲 You rolled: ${Math.floor(result.successRoll)}\n${result.stealBonus > 0 ? `💰 Underdog bonus: +${result.stealBonus}% max steal` : ''}`, 
                            inline: false 
                        }
                    )
                    .setTimestamp();

                // Add cooldown field only if cooldowns are enabled
                if (result.cooldownEnabled !== false) {
                    embed.addFields({
                        name: 'Cooldown', 
                        value: `You can raid again ${result.nextRaidTime}`, 
                        inline: false 
                    });
                } else {
                    embed.addFields({
                        name: 'Cooldown', 
                        value: 'Cooldowns are disabled. You can raid again immediately.', 
                        inline: false 
                    });
                }

                await interaction.editReply({
                    content: null,
                    embeds: [embed],
                    ephemeral: false
                });
            } else {
                // Failed raid
                const embed = new EmbedBuilder()
                    .setTitle('💀 RAID FAILED! 💀')
                    .setColor(0xFF0000)
                    .setDescription(narrativeMessage)
                    .addFields(
                        { 
                            name: `${interaction.user.username}'s Streak`, 
                            value: `${result.attackerOldStreak} → **${result.attackerNewStreak}** (-${result.riskAmount})`, 
                            inline: true 
                        },
                        { 
                            name: `${target.username}'s Streak`, 
                            value: `${result.defenderOldStreak} → **${result.defenderNewStreak}** (+${result.riskAmount})`, 
                            inline: true 
                        },
                        {
                            name: 'Raid Difficulty',
                            value: getDifficultyDescription(result.difficultyAdjustment),
                            inline: false
                        },
                        { 
                            name: 'Raid Stats', 
                            value: `❌ Success chance: ${result.successChance.toFixed(1)}%\n🎲 You rolled: ${Math.floor(result.successRoll)}\n${result.riskReduction > 0 ? `🛡️ Underdog protection: ${Math.round(result.riskReduction * 100)}% risk reduction` : ''}`, 
                            inline: false 
                        }
                    )
                    .setTimestamp();

                // Add cooldown field only if cooldowns are enabled
                if (result.cooldownEnabled !== false) {
                    embed.addFields({
                        name: 'Cooldown', 
                        value: `You can raid again ${result.nextRaidTime}`, 
                        inline: false 
                    });
                } else {
                    embed.addFields({
                        name: 'Cooldown', 
                        value: 'Cooldowns are disabled. You can raid again immediately.', 
                        inline: false 
                    });
                }

                await interaction.editReply({
                    content: null,
                    embeds: [embed],
                    ephemeral: false
                });
            }
        } catch (error) {
            console.error('Error in raid command:', error);
            
            // Generic error message with more details in console
            await interaction.editReply({
                content: `❌ An error occurred while processing your raid: ${error.message}`,
                ephemeral: false
            });
        }
    },
};

/**
 * Get a descriptive text for the raid difficulty based on the adjustment value
 * @param {number} adjustment - The difficulty adjustment value
 * @returns {string} Description of the difficulty
 */
function getDifficultyDescription(adjustment) {
    let emoji, description;
    
    if (adjustment <= -15) {
        emoji = '⚡'; // lightning
        description = 'Very Hard - The odds are heavily against you, but the rewards are greater!';
    } else if (adjustment <= -10) {
        emoji = '🔥'; // fire
        description = 'Hard - This is a challenging raid with higher potential rewards.';
    } else if (adjustment <= -5) {
        emoji = '⚠️'; // warning
        description = 'Challenging - The target has a significant advantage, but you also get bonus rewards.';
    } else if (adjustment >= 15) {
        emoji = '🍰'; // cake
        description = 'Very Easy - You have a huge advantage, but the rewards are reduced.';
    } else if (adjustment >= 10) {
        emoji = '😊'; // smile
        description = 'Easy - You have a clear advantage over your target.';
    } else if (adjustment >= 5) {
        emoji = '👍'; // thumbs up
        description = 'Somewhat Easy - You have a small advantage in this raid.';
    } else {
        emoji = '⚖️'; // scales
        description = 'Balanced - This raid has fairly even odds for both sides.';
    }
    
    return `${emoji} **${description.split(' - ')[0]}**\n${description.split(' - ')[1]}`;
} 