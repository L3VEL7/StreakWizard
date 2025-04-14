const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetraidcooldown')
        .setDescription('Reset a user\'s raid cooldown (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose raid cooldown to reset')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ADMINISTRATOR), // Restrict to admins only

    async execute(interaction) {
        // Only admins can use this command
        if (!interaction.member.permissions.has(PermissionFlagsBits.ADMINISTRATOR)) {
            return await interaction.reply({
                content: '❌ This command can only be used by server administrators.',
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        
        await interaction.deferReply({ ephemeral: true });

        try {
            // Get current cooldown status before reset
            const beforeStatus = await streakManager.getRemainingRaidTime(
                interaction.guildId,
                targetUser.id
            );

            // Reset the raid cooldown
            const result = await streakManager.resetRaidCooldown(
                interaction.guildId,
                targetUser.id,
                true // Confirm this is an admin operation
            );

            if (!result.success) {
                return await interaction.editReply({
                    content: `❌ ${result.message}`,
                    ephemeral: true
                });
            }

            // Get status after reset
            const afterStatus = await streakManager.getRemainingRaidTime(
                interaction.guildId,
                targetUser.id
            );

            // Create embed response
            const embed = new EmbedBuilder()
                .setTitle('⚡ Raid Cooldown Reset')
                .setColor(0x00FF00)
                .setDescription(`Successfully reset raid cooldown for ${targetUser.username}`)
                .addFields(
                    { 
                        name: 'Before Reset', 
                        value: beforeStatus.canRaid ? 
                            '✅ User could already raid' : 
                            `❌ User was on cooldown until <t:${Math.floor(beforeStatus.cooldownExpiry.getTime() / 1000)}:f>`, 
                        inline: false 
                    },
                    { 
                        name: 'After Reset', 
                        value: afterStatus.canRaid ? 
                            '✅ User can now raid immediately' : 
                            '❌ Something went wrong, user is still on cooldown', 
                        inline: false 
                    }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                ephemeral: true
            });

            // Also send a DM to the target user
            try {
                await targetUser.send(`Your raid cooldown in **${interaction.guild.name}** has been reset by an administrator. You can now raid immediately!`);
            } catch (dmError) {
                // DM failed, but that's okay - include note in admin response
                await interaction.followUp({
                    content: `Note: Unable to send DM notification to ${targetUser.username}. They might have DMs disabled.`,
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error in resetraidcooldown command:', error);
            
            await interaction.editReply({
                content: `❌ An error occurred while resetting raid cooldown: ${error.message}`,
                ephemeral: true
            });
        }
    },
}; 