const { SlashCommandBuilder, EmbedBuilder, InteractionFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: [InteractionFlags.Ephemeral] });
            
            const sent = await interaction.editReply({ 
                content: 'Pinging...', 
                flags: [InteractionFlags.Ephemeral] 
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
                flags: [InteractionFlags.Ephemeral] 
            });
        } catch (error) {
            console.error('Error in ping command:', error);
            await interaction.reply({ 
                content: '❌ There was an error while executing this command!', 
                flags: [InteractionFlags.Ephemeral] 
            });
        }
    },
}; 