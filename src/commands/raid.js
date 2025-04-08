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

            // Check for cooldown
            const cooldownInfo = await streakManager.getRemainingRaidTime(interaction.guildId, interaction.user.id);
            if (!cooldownInfo.canRaid) {
                const cooldownType = cooldownInfo.wasSuccessful ? 'successful' : 'failed';
                await interaction.editReply({
                    content: `⏳ You must wait ${cooldownInfo.remainingHours}h ${cooldownInfo.remainingMinutes}m before raiding again.\n(Cooldown after a ${cooldownType} raid: ${cooldownInfo.wasSuccessful ? raidConfig.successCooldownHours : raidConfig.failureCooldownHours} hours)`,
                    ephemeral: false
                });
                return;
            }

            // Check if user has enough streaks to raid
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, interaction.user.id);
            const attackerStreak = userStreaks.find(s => s.trigger === word);
            if (!attackerStreak || attackerStreak.count < 2) {
                await interaction.editReply({
                    content: '❌ You need at least 2 streaks to raid.',
                    ephemeral: false
                });
                return;
            }

            // Check if target has enough streaks to be raided
            const targetStreaks = await streakManager.getUserStreaks(interaction.guildId, target.id);
            const targetStreak = targetStreaks.find(s => s.trigger === word);
            if (!targetStreak || targetStreak.count < 2) {
                await interaction.editReply({
                    content: `❌ ${target} doesn't have enough streaks to raid.`,
                    ephemeral: false
                });
                return;
            }

            // Calculate progressive bonus based on defender's streak size
            let progressiveBonus = 0;
            if (targetStreak.count >= 100) progressiveBonus = 15;
            else if (targetStreak.count >= 75) progressiveBonus = 12;
            else if (targetStreak.count >= 50) progressiveBonus = 9;
            else if (targetStreak.count >= 25) progressiveBonus = 6;
            else if (targetStreak.count >= 10) progressiveBonus = 3;
            
            // Calculate streak ratio for dynamic adjustments
            let streakRatio = 1.0;
            let riskAdjustment = 1.0;
            let stealBonus = 0;
            
            if (attackerStreak && targetStreak) {
                streakRatio = attackerStreak.count / targetStreak.count;
                
                // Calculate dynamic adjustments for underdogs
                if (streakRatio < 0.75) {
                    riskAdjustment = Math.max(0.6, streakRatio);
                    
                    if (streakRatio < 0.5) {
                        stealBonus = 10; // +10% bonus for significant underdogs
                    } else {
                        stealBonus = 5; // +5% bonus for moderate underdogs
                    }
                }
            }
            
            // Prepare underdog bonus messages
            let underdogMessages = [];
            if (stealBonus > 0) {
                underdogMessages.push(`✅ Underdog bonus: +${stealBonus}% steal amount`);
            }
            if (riskAdjustment < 1.0) {
                const riskReduction = Math.round((1 - riskAdjustment) * 100);
                underdogMessages.push(`🛡️ Risk reduction: -${riskReduction}%`);
            }

            // Inform about the bonus chances for initiating the raid
            await interaction.editReply({
                content: `⚔️ **INITIATING RAID!** ⚔️\n${interaction.user} is raiding ${target}'s "${word}" streaks!\n\n💫 **Bonuses:**\n⭐ Raid initiator: +5% success chance\n🎯 Target streak (${targetStreak.count}): +${progressiveBonus}% success chance${underdogMessages.length > 0 ? '\n' + underdogMessages.join('\n') : ''}\n\nCalculating result...`,
                ephemeral: false
            });

            // Perform the raid
            const result = await streakManager.raidStreak(
                interaction.guildId,
                interaction.user.id,
                target.id,
                word
            );

            if (result.success) {
                await interaction.editReply({
                    content: `⚔️ **RAID SUCCESSFUL!** ⚔️\n${interaction.user} raided ${target} and stole ${result.stealAmount} "${word}" streaks!\n${interaction.user}'s new streak: ${result.attackerNewCount}\n${target}'s new streak: ${result.defenderNewCount}\n\n⏳ Cooldown: ${raidConfig.successCooldownHours || 4} hours`,
                    ephemeral: false
                });
            } else {
                await interaction.editReply({
                    content: `💀 **RAID FAILED!** 💀\n${interaction.user} tried to raid ${target} but failed and lost ${result.riskAmount} "${word}" streaks!\n${target} gained ${result.riskAmount} streaks as a defense bonus!\n${interaction.user}'s new streak: ${result.attackerNewCount}\n${target}'s new streak: ${result.defenderNewCount}\n\n⏳ Cooldown: ${raidConfig.failureCooldownHours || 2} hours`,
                    ephemeral: false
                });
            }
        } catch (error) {
            console.error('Error in raid command:', error);
            
            // Extract specific error messages to show the user
            let errorMessage = '❌ An error occurred while processing your raid.';
            
            // Common raid errors with more user-friendly messages
            if (error.message.includes("25% of the target's streak count")) {
                errorMessage = `❌ You need at least 25% of ${target}'s streak count (or at least 10 streaks) to raid them.`;
            } else if (error.message.includes("Target has no streak to raid")) {
                errorMessage = `❌ ${target} doesn't have any "${word}" streaks to raid.`;
            } else if (error.message.includes("You need a streak to raid")) {
                errorMessage = `❌ You need "${word}" streaks to raid someone.`;
            } else if (error.message.includes("must wait")) {
                errorMessage = `⏳ ${error.message}`;
            } else if (error.message.includes("Raid feature is not enabled")) {
                errorMessage = `❌ The raid system is currently disabled in this server.`;
            } else if (error.message.includes("Cannot raid yourself")) {
                errorMessage = `❌ You cannot raid yourself!`;
            } else if (error.message.includes("Target streak is too high")) {
                errorMessage = `❌ ${target}'s streak is too high to raid (maximum 10,000).`;
            } else if (error.message.includes("rapidly updated")) {
                errorMessage = `⚠️ ${target} is updating their streaks too quickly. Please try again later.`;
            }
            
            await interaction.editReply({
                content: errorMessage,
                ephemeral: false
            });
        }
    },
}; 