const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset a user\'s streak count')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset streaks for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to reset (leave empty to reset all)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '❌ You need administrator permissions to use this command.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('user');
            const word = interaction.options.getString('word')?.trim().toLowerCase();

            // Validate target user
            if (targetUser.bot) {
                return await interaction.editReply({
                    content: '❌ You cannot reset streaks for bots.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Check if user has any streaks
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, targetUser.id);
            if (!userStreaks || userStreaks.length === 0) {
                return await interaction.editReply({
                    content: `${targetUser} has no streaks to reset.`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Prepare warning message
            let warningMessage = '⚠️ **Warning:** This will reset ';
            if (word) {
                const targetStreak = userStreaks.find(s => s.trigger === word);
                if (!targetStreak) {
                    return await interaction.editReply({
                        content: `${targetUser} has no streaks for "${word}" to reset.`,
                        flags: [InteractionResponseFlags.Ephemeral]
                    });
                }
                warningMessage += `${targetUser}'s streak for "${word}" (${targetStreak.count} streaks)`;
            } else {
                const totalStreaks = userStreaks.reduce((sum, streak) => sum + streak.count, 0);
                warningMessage += `all of ${targetUser}'s streaks (${totalStreaks} total streaks)`;
            }
            warningMessage += '.\n\nAre you sure you want to proceed?';

            await interaction.editReply({
                content: warningMessage,
                flags: [InteractionResponseFlags.Ephemeral]
            });

            // Wait for confirmation
            const filter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await interaction.channel.awaitMessageComponent({
                    filter,
                    time: 30000,
                    componentType: 2 // Button component
                });

                if (confirmation.customId === 'confirm') {
                    // Log the reset action
                    console.log('=== Streak Reset ===');
                    console.log(`Time: ${new Date().toISOString()}`);
                    console.log(`Initiator: ${interaction.user.tag} (${interaction.user.id})`);
                    console.log(`Target: ${targetUser.tag} (${targetUser.id})`);
                    console.log(`Guild: ${interaction.guild.name} (${interaction.guild.id})`);
                    console.log(`Word: ${word || 'all'}`);
                    console.log('==================');

                    // Reset streaks
                    if (word) {
                        await streakManager.resetUserStreak(interaction.guildId, targetUser.id, word);
                        const message = `✅ Reset ${targetUser}'s streak for "${word}" to 0.`;
                        await interaction.editReply(message);
                    } else {
                        await streakManager.resetAllUserStreaks(interaction.guildId, targetUser.id);
                        const message = `✅ Reset all of ${targetUser}'s streaks to 0.`;
                        await interaction.editReply(message);
                    }
                } else {
                    await interaction.editReply({
                        content: '❌ Operation cancelled.',
                        flags: [InteractionResponseFlags.Ephemeral]
                    });
                }
            } catch (error) {
                await interaction.editReply({
                    content: '❌ No confirmation received. Operation cancelled.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

        } catch (error) {
            console.error('Error in reset command:', error);
            const errorMessage = error.message || 'An error occurred while resetting streaks.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }
        }
    }
}; 