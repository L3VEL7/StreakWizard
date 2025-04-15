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
            const result = await streakManager.raidUserStreak(
                interaction.guildId,
                interaction.user.id,
                target.id,
                word
            );

            // If the raid couldn't be initiated due to pre-conditions
            if (!result.success) {
                await interaction.editReply({
                    content: `❌ ${result.message}`,
                    ephemeral: false
                });
                return;
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
                            name: 'Raid Stats', 
                            value: `✅ Success rate: ${Math.round(result.successChance)}%\n🎲 You rolled: ${Math.floor(result.successRoll)}`, 
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
                            name: 'Raid Stats', 
                            value: `❌ Success rate: ${Math.round(result.successChance)}%\n🎲 You rolled: ${Math.floor(result.successRoll)}`, 
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