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
    "{{attacker}} tiptoed through the enchanted forest and snuck into {{defender}}'s cottage, filching {{amount}} {{word}} streaks just as the porridge cooled perfectly!", 
    "Under the glow of the moon, {{attacker}} slipped past the guards at {{defender}}'s door and absconded with {{amount}} enchanting {{word}} streaks!", 
    "{{attacker}} discovered a hidden path in the woods leading straight into {{defender}}'s pantry, liberating {{amount}} {{word}} streaks in one silent swoop!", 
    "With the cunning of a true adventurer, {{attacker}} waltzed into {{defender}}'s cozy abode and nabbed {{amount}} precious {{word}} streaks!", 
    "Gliding over dewy grass, {{attacker}} bypassed all obstacles and made off with {{amount}} sought-after {{word}} streaks from {{defender}}'s reserve!", 
    "{{attacker}} stealthily crept inside {{defender}}'s quaint home, scooping up {{amount}} warm and just-right {{word}} streaks!", 
    "In the quiet of the twilight, {{attacker}} outsmarted the defenses at {{defender}}'s lair to secure {{amount}} sparkling {{word}} streaks!", 
    "Braving the mysterious woods, {{attacker}} followed the trail to {{defender}}'s treasure trove and spirited away {{amount}} {{word}} streaks!", 
    "With a whisper and a wink, {{attacker}} infiltrated {{defender}}'s hidden den and pocketed {{amount}} shimmering {{word}} streaks!", 
    "Under a starlit sky, {{attacker}} found the secret entrance to {{defender}}'s hut and claimed {{amount}} coveted {{word}} streaks!", 
    "{{attacker}} followed a trail of clues into {{defender}}'s secret hideaway and gracefully lifted {{amount}} treasured {{word}} streaks!", 
    "Like a true fairy tale rogue, {{attacker}} danced past the defenses guarding {{defender}}'s lair and stole {{amount}} {{word}} streaks!", 
    "{{attacker}} shuffled through the shadows of {{defender}}'s woodland retreat and whisked away {{amount}} delightful {{word}} streaks!", 
    "Gliding silently under the canopy, {{attacker}} bypassed every charm on {{defender}}'s front door and reclaimed {{amount}} {{word}} streaks!", 
    "In a daring escapade, {{attacker}} discovered a moonlit secret in {{defender}}'s pantry, liberating {{amount}} mesmerizing {{word}} streaks!", 
    "{{attacker}} crept through the forest glen and into {{defender}}'s snug cottage, securing {{amount}} coveted {{word}} streaks with finesse!", 
    "With stealth as their ally, {{attacker}} navigated the trails to {{defender}}'s hideout and plundered {{amount}} shimmering {{word}} streaks!",
    "Under the guise of night, {{attacker}} slipped into {{defender}}'s dwelling and absconded with {{amount}} brilliant {{word}} streaks!", 
    "{{attacker}} charmed the woodland spirits to guide them right into {{defender}}'s secret nook, procuring {{amount}} pristine {{word}} streaks!", 
    "With nimble footsteps, {{attacker}} bypassed every trap in {{defender}}'s enchanted homestead to seize {{amount}} glowing {{word}} streaks!", 
    "In a bold midnight raid, {{attacker}} infiltrated {{defender}}'s mystical manor and spirited away {{amount}} exquisite {{word}} streaks!", 
    "Silently, {{attacker}} journeyed through the whispering woods to uncover {{defender}}'s trove, claiming {{amount}} alluring {{word}} streaks!", 
    "{{attacker}} quietly crossed the magical threshold of {{defender}}'s cottage, liberating {{amount}} fabled {{word}} streaks in one swift move!", 
    "Guided by fate and fortune, {{attacker}} slipped past the enchanted locks on {{defender}}'s door, capturing {{amount}} delightful {{word}} streaks!", 
    "Under a shimmering sky, {{attacker}} blended with the night shadows and filched {{amount}} just-right {{word}} streaks from {{defender}}'s trove!"
];

const failureMessages = [
    "While attempting to nab {{amount}} {{word}} streaks from {{defender}}, {{attacker}} stumbled over a magic pebble and lost them instead!", 
    "{{attacker}}'s stealthy venture into {{defender}}'s cottage was foiled by a creaking floorboard, costing them {{amount}} {{word}} streaks!", 
    "In a twist of fate, {{attacker}} misjudged the softness of the porridge and, caught in the act, forfeited {{amount}} {{word}} streaks to {{defender}}!", 
    "As {{attacker}} crept through the enchanted glen, a sudden rustle revealed their presence, and {{defender}} reclaimed {{amount}} {{word}} streaks!", 
    "A misstep in the moonlit forest left {{attacker}} exposed, and {{defender}} scooped up {{amount}} {{word}} streaks as restitution!", 
    "While silently sliding into {{defender}}'s refuge, {{attacker}} was caught by a cunning trap, surrendering {{amount}} {{word}} streaks!", 
    "An unexpected lull in the magic of the night allowed {{defender}} to catch {{attacker}} red-handed, confiscating {{amount}} {{word}} streaks!", 
    "{{attacker}}'s daring raid on {{defender}}'s treasure trove went awry when a bewitched door slammed, leading to a loss of {{amount}} {{word}} streaks!", 
    "In a clumsy attempt to pilfer {{amount}} {{word}} streaks, {{attacker}} was caught by the guardian of the cottage and had to forfeit them!", 
    "{{attacker}}'s secret passage into {{defender}}'s den was revealed by a stray ray of sunlight, resulting in a loss of {{amount}} {{word}} streaks!", 
    "While reaching for {{amount}} coveted {{word}} streaks, {{attacker}} triggered an ancient charm at {{defender}}'s home, and lost everything!", 
    "Caught by the magic of a misfired spell, {{attacker}}’s attempt to snatch {{amount}} {{word}} streaks from {{defender}} ended in failure!", 
    "A sudden gust of enchanted wind betrayed {{attacker}}’s position, allowing {{defender}} to reclaim {{amount}} {{word}} streaks!", 
    "As {{attacker}} attempted a silent entry, a creaking floor alerted {{defender}}, resulting in a misadventure that cost {{amount}} {{word}} streaks!", 
    "Dancing in the moonlight proved tricky—{{attacker}} lost their grip and fumbled {{amount}} {{word}} streaks into {{defender}}'s hands!", 
    "In their haste, {{attacker}} tripped over a hidden root by {{defender}}’s dwelling, surrendering {{amount}} {{word}} streaks as penalty!", 
    "The charm on {{defender}}'s door proved too strong, and {{attacker}}'s attempt to secure {{amount}} {{word}} streaks backfired terribly!", 
    "In a moment of clumsy bravado, {{attacker}} miscalculated the magic in the air and ended up losing {{amount}} {{word}} streaks to {{defender}}!", 
    "The enchanted locks of {{defender}}'s cottage thwarted {{attacker}}’s plot, causing the loss of {{amount}} {{word}} streaks during the raid!", 
    "Caught in a swirl of enchanted dust, {{attacker}}’s plan evaporated, and {{defender}} recovered {{amount}} {{word}} streaks with ease!", 
    "While sneaking into the fairy tale abode, {{attacker}} set off a hidden alarm and, as a penalty, lost {{amount}} {{word}} streaks to {{defender}}!", 
    "A misdirected step in the enchanted woods alerted {{defender}}, and {{attacker}} ended up losing {{amount}} {{word}} streaks in the commotion!", 
    "{{attacker}}’s attempt to pinch {{amount}} {{word}} streaks from {{defender}} was foiled by a cunning guardian, leaving them empty-handed!", 
    "In the heat of the escapade, a bewitched broom swept by, exposing {{attacker}}'s plan and costing them {{amount}} {{word}} streaks!", 
    "The perfect blend of magic and misfortune struck as {{attacker}} tried to nab {{amount}} {{word}} streaks, only to have them whisked away by {{defender}}!"
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
