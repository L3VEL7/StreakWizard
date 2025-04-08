const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Path to the raid messages file
const RAID_MESSAGES_PATH = path.join(__dirname, '../data/raidMessages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raidnarratives')
        .setDescription('Manage raid narratives')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available raid narratives'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new raid narrative')
                .addStringOption(option => 
                    option.setName('type')
                        .setDescription('Type of narrative')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Success', value: 'success' },
                            { name: 'Failure', value: 'failure' }
                        ))
                .addStringOption(option =>
                    option.setName('narrative')
                        .setDescription('The narrative to add. Use {{attacker}}, {{defender}}, {{amount}}, and {{word}} as placeholders')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a raid narrative')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of narrative')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Success', value: 'success' },
                            { name: 'Failure', value: 'failure' }
                        ))
                .addIntegerOption(option =>
                    option.setName('index')
                        .setDescription('The index of the narrative to delete (from the list command)')
                        .setRequired(true)
                        .setMinValue(0))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Get the current raid messages
            let messagesContent = await fs.readFile(RAID_MESSAGES_PATH, 'utf8');
            
            if (subcommand === 'list') {
                await this.listNarratives(interaction, messagesContent);
            } else if (subcommand === 'add') {
                const type = interaction.options.getString('type');
                const narrative = interaction.options.getString('narrative');
                await this.addNarrative(interaction, messagesContent, type, narrative);
            } else if (subcommand === 'delete') {
                const type = interaction.options.getString('type');
                const index = interaction.options.getInteger('index');
                await this.deleteNarrative(interaction, messagesContent, type, index);
            }
        } catch (error) {
            console.error('Error handling raid narratives command:', error);
            await interaction.editReply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
    
    async listNarratives(interaction, messagesContent) {
        // Get the narrative arrays from the file content
        const successMatches = messagesContent.match(/const\s+successMessages\s*=\s*\[([\s\S]*?)\];/);
        const failureMatches = messagesContent.match(/const\s+failureMessages\s*=\s*\[([\s\S]*?)\];/);
        
        if (!successMatches || !failureMatches) {
            await interaction.editReply({
                content: '❌ Could not parse the raid narratives file.',
                ephemeral: true
            });
            return;
        }
        
        // Extract and format the narratives
        const successRaw = successMatches[1].trim();
        const failureRaw = failureMatches[1].trim();
        
        const successNarratives = this.parseNarratives(successRaw);
        const failureNarratives = this.parseNarratives(failureRaw);
        
        // Create embeds for success and failure narratives
        const successEmbed = new EmbedBuilder()
            .setTitle('🟢 Success Narratives')
            .setColor(0x00FF00)
            .setDescription(
                successNarratives.map((narrative, index) => 
                    `**${index}**: ${narrative.replace(/"/g, '')}`
                ).join('\n\n')
            );
            
        const failureEmbed = new EmbedBuilder()
            .setTitle('🔴 Failure Narratives')
            .setColor(0xFF0000)
            .setDescription(
                failureNarratives.map((narrative, index) => 
                    `**${index}**: ${narrative.replace(/"/g, '')}`
                ).join('\n\n')
            );
        
        // Send the embeds
        await interaction.editReply({
            content: 'Here are the current raid narratives:',
            embeds: [successEmbed, failureEmbed],
            ephemeral: true
        });
    },
    
    async addNarrative(interaction, messagesContent, type, narrative) {
        // Validate the narrative format
        if (!narrative.includes('{{attacker}}') || !narrative.includes('{{defender}}') || !narrative.includes('{{amount}}')) {
            await interaction.editReply({
                content: '❌ Narrative must include {{attacker}}, {{defender}}, and {{amount}} placeholders.',
                ephemeral: true
            });
            return;
        }
        
        // Format the new narrative with proper quotes and line ending
        const formattedNarrative = `    "${narrative}",`;
        
        // Determine which array to update
        const arrayName = type === 'success' ? 'successMessages' : 'failureMessages';
        const regex = new RegExp(`(const\\s+${arrayName}\\s*=\\s*\\[)[\\s\\S]*?(\\];)`, 'g');
        
        // Get the current array content
        const matches = messagesContent.match(new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[(([\\s\\S]*?))\\];`));
        if (!matches) {
            await interaction.editReply({
                content: `❌ Could not find the ${arrayName} array in the file.`,
                ephemeral: true
            });
            return;
        }
        
        // Get the current array content and add the new narrative
        let currentContent = matches[1].trim();
        
        // If the array is empty or ends with a comment, handle it properly
        if (currentContent === '' || currentContent.trim().endsWith('//')) {
            currentContent += '\n    ' + formattedNarrative;
        } else {
            currentContent += '\n' + formattedNarrative;
        }
        
        // Replace the array in the content
        const updatedContent = messagesContent.replace(
            regex, 
            `$1${currentContent}\n$2`
        );
        
        // Write the updated file
        await fs.writeFile(RAID_MESSAGES_PATH, updatedContent, 'utf8');
        
        // Reload the module to apply changes
        delete require.cache[require.resolve('../data/raidMessages')];
        
        await interaction.editReply({
            content: `✅ Successfully added a new ${type} narrative!`,
            ephemeral: true
        });
    },
    
    async deleteNarrative(interaction, messagesContent, type, index) {
        // Determine which array to update
        const arrayName = type === 'success' ? 'successMessages' : 'failureMessages';
        
        // Get the current array content
        const matches = messagesContent.match(new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[(([\\s\\S]*?))\\];`));
        if (!matches) {
            await interaction.editReply({
                content: `❌ Could not find the ${arrayName} array in the file.`,
                ephemeral: true
            });
            return;
        }
        
        // Parse the narratives
        const narratives = this.parseNarratives(matches[1].trim());
        
        // Validate the index
        if (index < 0 || index >= narratives.length) {
            await interaction.editReply({
                content: `❌ Invalid index. Please use an index between 0 and ${narratives.length - 1}.`,
                ephemeral: true
            });
            return;
        }
        
        // The narrative to be deleted
        const deletedNarrative = narratives[index].replace(/"/g, '');
        
        // Remove the narrative
        narratives.splice(index, 1);
        
        // Rebuild the array content
        const updatedArrayContent = narratives.length > 0 
            ? '\n    ' + narratives.join(',\n    ') + '\n'
            : '\n';
        
        // Replace the array in the content
        const regex = new RegExp(`(const\\s+${arrayName}\\s*=\\s*\\[)[\\s\\S]*?(\\];)`, 'g');
        const updatedContent = messagesContent.replace(
            regex, 
            `$1${updatedArrayContent}$2`
        );
        
        // Write the updated file
        await fs.writeFile(RAID_MESSAGES_PATH, updatedContent, 'utf8');
        
        // Reload the module to apply changes
        delete require.cache[require.resolve('../data/raidMessages')];
        
        await interaction.editReply({
            content: `✅ Successfully deleted the ${type} narrative at index ${index}:\n\n${deletedNarrative}`,
            ephemeral: true
        });
    },
    
    parseNarratives(content) {
        // Handle empty arrays
        if (!content.trim()) {
            return [];
        }
        
        // Split the content by line and filter out comments and empty lines
        let lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('//'));
        
        // Join lines that may have been split across multiple lines
        let narratives = [];
        let currentNarrative = '';
        
        for (const line of lines) {
            currentNarrative += line;
            
            // If the line completes a narrative (ends with a comma)
            if (line.endsWith(',')) {
                // Remove the trailing comma
                narratives.push(currentNarrative.slice(0, -1));
                currentNarrative = '';
            }
        }
        
        // Add the last narrative if it doesn't end with a comma
        if (currentNarrative) {
            narratives.push(currentNarrative);
        }
        
        return narratives;
    }
}; 