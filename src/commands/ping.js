const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const sent = await interaction.editReply({ 
                content: 'Pinging...', 
                ephemeral: true 
            });

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: 'Latency', value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
                    { name: 'API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ 
                content: null,
                embeds: [embed], 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Error in ping command:', error);
            await interaction.reply({ 
                content: '❌ There was an error while executing this command!', 
                ephemeral: true 
            });
        }
    },
}; 