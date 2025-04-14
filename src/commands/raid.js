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
                content: `⚔️ Preparing to raid ${target}'s "${word}" streaks...\nChecking conditions...`,
                ephemeral: false
            });

            // Get user streaks for display
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, interaction.user.id);
            const targetStreaks = await streakManager.getUserStreaks(interaction.guildId, target.id);
            
            const attackerStreak = userStreaks.find(s => s.trigger === word);
            const targetStreak = targetStreaks.find(s => s.trigger === word);
            
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

            // Determine success or failure of the raid
            if (result.raidSuccess) {
                // Successful raid
                const embed = new EmbedBuilder()
                    .setTitle('⚔️ RAID SUCCESSFUL! ⚔️')
                    .setColor(0x00FF00)
                    .setDescription(`${interaction.user} raided ${target} and stole **${result.stealAmount}** "${word}" streaks!`)
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
                            value: `✅ Success rate: ${Math.round(result.successChance)}%\n🎲 You rolled: ${Math.floor(result.successRoll)}\n\n__Success Chance Breakdown:__\nBase: ${result.baseSuccessChance}%\nInitiator Bonus: +${result.initiatorBonus}%\nStreak Size Bonus: +${result.progressiveBonus}%\n${result.streakRatio < 0.75 ? `Underdog Bonus: Risk reduced by ${Math.round((1-result.streakRatio)*100)}%` : ""}`, 
                            inline: false 
                        },
                        { 
                            name: 'Cooldown', 
                            value: result.cooldownMessage, 
                            inline: false 
                        }
                    )
                    .setTimestamp();

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
                    .setDescription(`${interaction.user} tried to raid ${target} but failed and lost **${result.riskAmount}** "${word}" streaks to them!`)
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
                            value: `❌ Success rate: ${Math.round(result.successChance)}%\n🎲 You rolled: ${Math.floor(result.successRoll)}\n\n__Success Chance Breakdown:__\nBase: ${result.baseSuccessChance}%\nInitiator Bonus: +${result.initiatorBonus}%\nStreak Size Bonus: +${result.progressiveBonus}%\n${result.streakRatio < 0.75 ? `Underdog Bonus: Risk reduced by ${Math.round((1-result.streakRatio)*100)}%` : ""}`, 
                            inline: false 
                        },
                        { 
                            name: 'Cooldown', 
                            value: result.cooldownMessage, 
                            inline: false 
                        }
                    )
                    .setTimestamp();

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