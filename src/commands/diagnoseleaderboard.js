const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diagnoseleaderboard')
        .setDescription('Check for issues with the leaderboard command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    guildOnly: true,

    async execute(interaction) {
        // Check if this is in a guild
        if (!interaction.guild) {
            return await interaction.reply({
                content: '❌ This command can only be used in a server, not in DMs.',
                ephemeral: true
            });
        }
        
        // Check for administrator permissions safely
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await interaction.editReply({
                content: '🔍 Checking for leaderboard issues...',
                ephemeral: true
            });
            
            // 1. Check for configured trigger words
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            
            if (!triggerWords || triggerWords.length === 0) {
                return await interaction.editReply({
                    content: '⚠️ No trigger words found for this server. Please set up trigger words first.',
                    ephemeral: true
                });
            }
            
            let diagnosticReport = `**Leaderboard Diagnostic Report**\n\n`;
            diagnosticReport += `Found ${triggerWords.length} trigger words: ${triggerWords.join(', ')}\n\n`;
            
            // 2. For each trigger word, try to get a small leaderboard
            for (const triggerWord of triggerWords) {
                try {
                    // Try to get just 3 entries to see if it works
                    const startTime = Date.now();
                    const leaderboard = await streakManager.getLeaderboard(interaction.guildId, triggerWord, 3);
                    const endTime = Date.now();
                    
                    diagnosticReport += `✅ **${triggerWord}**: `;
                    
                    if (leaderboard && leaderboard.length > 0) {
                        diagnosticReport += `Retrieved ${leaderboard.length} entries in ${endTime - startTime}ms\n`;
                    } else {
                        diagnosticReport += `No entries found (but query succeeded)\n`;
                    }
                } catch (error) {
                    diagnosticReport += `❌ **${triggerWord}**: Error - ${error.message}\n`;
                }
            }
            
            // 3. Try to get all entries for a small leaderboard to see if there's a size issue
            try {
                const startTime = Date.now();
                const fullLeaderboard = await streakManager.getLeaderboard(interaction.guildId, triggerWords[0], 10);
                const endTime = Date.now();
                
                diagnosticReport += `\n**Full Leaderboard Test**:\n`;
                diagnosticReport += `✅ Retrieved ${fullLeaderboard.length} entries in ${endTime - startTime}ms\n`;
                
                if (fullLeaderboard.length > 0) {
                    // Show a sample entry without trying to fetch usernames
                    diagnosticReport += `\nSample entry format: ${JSON.stringify(fullLeaderboard[0])}\n`;
                }
            } catch (error) {
                diagnosticReport += `\n**Full Leaderboard Test**:\n`;
                diagnosticReport += `❌ Error - ${error.message}\n`;
            }
            
            // Add the streakManager export structure to ensure it's correct
            diagnosticReport += `\n**StreakManager Export**:\n`;
            const streakManagerMethods = Object.keys(streakManager);
            diagnosticReport += `Available methods: ${streakManagerMethods.join(', ')}\n`;
            
            await interaction.editReply({
                content: diagnosticReport,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in diagnoseleaderboard:', error);
            await interaction.editReply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
}; 