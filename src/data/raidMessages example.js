/**
 * Raid Narratives for Streakwiz Bot
 * 
 * This file contains narrative templates for successful and failed raids.
 * Admins can add, modify, or remove narratives without changing the bot code.
 * 
 * Available variables:
 * - {{attacker}} - The user who initiated the raid
 * - {{defender}} - The user who was raided
 * - {{amount}} - The amount of streaks stolen/lost
 * - {{word}} - The trigger word being raided
 * 
 * Each message should tell a short story while conveying what happened in the raid.
 */

const successMessages = [
    // Fantasy/Adventure themes
    "{{attacker}} sneakily infiltrated {{defender}}'s treasure vault, making off with {{amount}} precious {{word}} streaks!",
    "{{attacker}} gracefully maneuvered through {{defender}}'s kitchen, lifting {{amount}} {{word}} streaks when the porridge was at its warmest!",
    "Under the cover of darkness, {{attacker}} successfully plundered {{amount}} {{word}} streaks from {{defender}}'s coffers!",
    "With a flick of the wrist, {{attacker}} expertly pickpocketed {{amount}} {{word}} streaks from an unsuspecting {{defender}}!",
    "{{attacker}} found the hidden path through {{defender}}'s defenses, escaping with {{amount}} glorious {{word}} streaks!",
    
    // Heist themes
    "In a daring heist, {{attacker}} bypassed all security and stole {{amount}} {{word}} streaks from {{defender}}'s vault!",
    "Mission Successful: Agent {{attacker}} extracted {{amount}} {{word}} streaks from target {{defender}}'s collection!",
    "The perfect crime! {{attacker}} lifted {{amount}} {{word}} streaks from {{defender}} without leaving a trace!",
    
    // Humorous
    "While {{defender}} was distracted by a squirrel, {{attacker}} casually walked away with {{amount}} {{word}} streaks!",
    "{{attacker}} offered {{defender}} a 'free high-five' but secretly took {{amount}} {{word}} streaks in the process!",
    "{{attacker}} convinced {{defender}} that sharing {{amount}} {{word}} streaks was the latest trend!"
];

const failureMessages = [
    // Fantasy/Adventure themes
    "{{attacker}} tripped on a loose floorboard, alerting {{defender}} who confiscated {{amount}} {{word}} streaks as penalty!",
    "The alarm was triggered! {{defender}} caught {{attacker}} red-handed and claimed {{amount}} {{word}} streaks as compensation!",
    "{{attacker}}'s elaborate plan fell apart when {{defender}}'s pet dragon awoke, costing {{attacker}} {{amount}} {{word}} streaks!",
    "An unforeseen magical barrier protected {{defender}}'s streaks, reflecting the raid and costing {{attacker}} {{amount}} {{word}} streaks!",
    
    // Heist themes
    "The heist went sideways! {{defender}}'s security system trapped {{attacker}}, who had to surrender {{amount}} {{word}} streaks to escape!",
    "Mission Failed: {{defender}} detected Agent {{attacker}}'s presence and confiscated {{amount}} {{word}} streaks as evidence!",
    "{{attacker}} accidentally set off the alarm, allowing {{defender}} to turn the tables and claim {{amount}} {{word}} streaks!",
    
    // Humorous
    "In a bizarre turn of events, {{attacker}} accidentally donated {{amount}} {{word}} streaks to {{defender}}'s charity!",
    "{{attacker}} slipped on a conveniently placed banana peel, dropping {{amount}} {{word}} streaks that {{defender}} quickly collected!",
    "Plot twist! {{defender}}'s streaks were actually decoys, and {{attacker}} lost {{amount}} real {{word}} streaks in the confusion!"
];

// Format: Export the messages for use in the bot
module.exports = {
    successMessages,
    failureMessages,
    
    /**
     * Gets a random narrative message from the appropriate list
     * @param {boolean} success - Whether the raid was successful
     * @returns {string} A random narrative message
     */
    getRandomMessage(success) {
        const messages = success ? successMessages : failureMessages;
        const randomIndex = Math.floor(Math.random() * messages.length);
        return messages[randomIndex];
    },
    
    /**
     * Formats a narrative message by replacing placeholders with actual values
     * @param {string} message - The narrative message template
     * @param {object} data - Object containing values to insert
     * @returns {string} The formatted message
     */
    formatMessage(message, data) {
        let formatted = message;
        for (const [key, value] of Object.entries(data)) {
            formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return formatted;
    }
}; 