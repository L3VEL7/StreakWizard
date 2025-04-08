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

// Define backup narratives in case loading fails
const DEFAULT_SUCCESS_MESSAGES = [
    "{{attacker}} sneakily infiltrated {{defender}}'s treasure vault, making off with {{amount}} precious {{word}} streaks!",
    "{{attacker}} gracefully maneuvered through {{defender}}'s kitchen, lifting {{amount}} {{word}} streaks when the porridge was at its warmest!"
];

const DEFAULT_FAILURE_MESSAGES = [
    "{{attacker}} tripped on a loose floorboard, alerting {{defender}} who confiscated {{amount}} {{word}} streaks as penalty!",
    "The alarm was triggered! {{defender}} caught {{attacker}} red-handed and claimed {{amount}} {{word}} streaks as compensation!"
];

// Define main arrays of success and failure messages
const successMessages = [
    "{{attacker}} raided {{defender}}'s storage and stole {{amount}} {{word}} streaks!",
    "{{attacker}} successfully sneaked into {{defender}}'s base, making off with {{amount}} {{word}} streaks!",
    "{{attacker}} devised a brilliant strategy and stole {{amount}} {{word}} streaks from {{defender}}!",
    "{{attacker}} executed a perfect heist, stealing {{amount}} {{word}} streaks from {{defender}}!",
    "{{attacker}} struck in the dead of night, taking {{amount}} {{word}} streaks from {{defender}}!",
    "A successful raid! {{attacker}} grabbed {{amount}} {{word}} streaks from {{defender}}!",
    "{{attacker}} found {{defender}}'s streak stash and took {{amount}} {{word}} streaks!",
    "The stealth mission was a success! {{attacker}} acquired {{amount}} {{word}} streaks from {{defender}}!",
    "{{attacker}} outsmarted {{defender}}'s defenses and stole {{amount}} {{word}} streaks!",
    "Sweet victory! {{attacker}} plundered {{amount}} {{word}} streaks from {{defender}}!"
];

const failureMessages = [
    "{{attacker}} tried to raid {{defender}} but failed miserably, losing {{amount}} {{word}} streaks!",
    "{{defender}} caught {{attacker}} red-handed! {{attacker}} lost {{amount}} {{word}} streaks as penalty!",
    "The raid backfired! {{attacker}} lost {{amount}} {{word}} streaks to {{defender}}!",
    "{{defender}}'s defenses were too strong! {{attacker}} lost {{amount}} {{word}} streaks in the attempt!",
    "{{attacker}} tripped the alarm and got caught! {{defender}} claimed {{amount}} {{word}} streaks as compensation!",
    "A failed raid attempt! {{attacker}} lost {{amount}} {{word}} streaks to {{defender}}!",
    "{{attacker}}'s plan wasn't good enough. {{defender}} took {{amount}} {{word}} streaks as penalty!",
    "Busted! {{defender}} caught {{attacker}} and claimed {{amount}} {{word}} streaks!",
    "{{defender}} was ready for the attack and defended successfully, taking {{amount}} {{word}} streaks from {{attacker}}!",
    "{{defender}}'s counter-raid was successful, claiming {{amount}} {{word}} streaks from {{attacker}}!"
];

// Handle module export with error catching
try {
    module.exports = {
        successMessages: successMessages || DEFAULT_SUCCESS_MESSAGES,
        failureMessages: failureMessages || DEFAULT_FAILURE_MESSAGES,
        
        /**
         * Gets a random narrative message from the appropriate list
         * @param {boolean} success - Whether the raid was successful
         * @returns {string} A random narrative message
         */
        getRandomMessage(success) {
            try {
                const messages = success ? 
                    (successMessages || DEFAULT_SUCCESS_MESSAGES) : 
                    (failureMessages || DEFAULT_FAILURE_MESSAGES);
                
                if (!messages || !Array.isArray(messages) || messages.length === 0) {
                    throw new Error('No valid messages found');
                }
                
                const randomIndex = Math.floor(Math.random() * messages.length);
                return messages[randomIndex];
            } catch (error) {
                console.error('Error getting random message:', error);
                // Return a safe default
                return success ? 
                    "{{attacker}} stole {{amount}} {{word}} streaks from {{defender}}!" :
                    "{{attacker}} failed and lost {{amount}} {{word}} streaks to {{defender}}!";
            }
        },
        
        /**
         * Formats a narrative message by replacing placeholders with actual values
         * @param {string} message - The narrative message template
         * @param {object} data - Object containing values to insert
         * @returns {string} The formatted message
         */
        formatMessage(message, data) {
            try {
                if (!message || typeof message !== 'string') {
                    throw new Error('Invalid message template');
                }
                
                let formatted = message;
                for (const [key, value] of Object.entries(data || {})) {
                    if (value !== undefined && value !== null) {
                        formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
                    }
                }
                
                // Check if any placeholders remain
                if (formatted.includes('{{') && formatted.includes('}}')) {
                    console.warn('Unresolved placeholders in formatted message:', formatted);
                }
                
                return formatted;
            } catch (error) {
                console.error('Error formatting message:', error);
                // Return a safe default with the data we have
                return `${data?.attacker || 'Someone'} ${data?.success ? 'stole' : 'lost'} ${data?.amount || 'some'} streaks.`;
            }
        },
        
        /**
         * Validates if a message has all required placeholders
         * @param {string} message - The message template to validate
         * @returns {boolean} True if all required placeholders are present
         */
        validateMessage(message) {
            try {
                if (!message || typeof message !== 'string') {
                    return false;
                }
                
                const requiredPlaceholders = ['{{attacker}}', '{{defender}}', '{{amount}}', '{{word}}'];
                return requiredPlaceholders.every(placeholder => message.includes(placeholder));
            } catch (error) {
                console.error('Error validating message:', error);
                return false;
            }
        }
    };
} catch (error) {
    console.error('Error exporting raid messages module:', error);
    // Provide a minimal fallback export
    module.exports = {
        successMessages: DEFAULT_SUCCESS_MESSAGES,
        failureMessages: DEFAULT_FAILURE_MESSAGES,
        getRandomMessage: (success) => success ? DEFAULT_SUCCESS_MESSAGES[0] : DEFAULT_FAILURE_MESSAGES[0],
        formatMessage: (message, data) => message.replace(/{{(\w+)}}/g, (_, key) => data[key] || ''),
        validateMessage: () => true // Always return true in fallback mode to avoid blocking functionality
    };
} 