
# Discord Streak Bot

A Discord bot that helps track user streaks for specific trigger words.

## Setup

1. Create a Discord application and bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable "Message Content Intent" in the Bot settings
3. Copy your bot token
4. Create a new Repl and import this project
5. Add your Discord bot token to Replit's Secrets tab with key `DISCORD_TOKEN`
6. Install dependencies:
   ```bash
   npm install
   ```
7. Start the bot:
   ```bash
   node src/index.js
   ```

## Bot Setup

1. After adding the bot to your server:
   - Use `/setup` to configure trigger words (admin only)
   - Use `/setstreak_limit` to configure how often users can update their streaks (admin only)
     - Options: hourly, daily, or none (unlimited)
     - Important: Set this after configuring trigger words
   - Use `/remove` to remove specific trigger words (admin only)
   - Use `/leaderboard` to view rankings for each trigger word
   - Use `/help` to view all available commands
   - Users can start building streaks by sending messages that exactly match the trigger words
   - The bot will react with 🔥 to confirm streak increments

2. Example Setup:
   ```
   /setup words:daily,workout,study
   /setstreak_limit interval:daily
   /remove words:workout
   ```

## Permissions Required

The bot needs the following Discord permissions:
- Send Messages
- Read Message History
- Add Reactions
- Use Application Commands

## Need Help?

Use the `/help` command in Discord to see all available commands and their usage.
