npm install
   ```
7. Start the bot:
   ```bash
   node src/index.js
   ```

## Deployment

### Replit Deployment 

1. Click the "Release" button at the top right of your Replit workspace
2. Select "Deploy" from the dropdown menu
3. Choose your preferred deployment tier
4. Configure the deployment:
   - Build Command: `npm install`
   - Run Command: `node src/index.js`
   - Ensure "Health check before promoting" is unchecked since this is a Discord bot
5. Click "Deploy" to publish your bot

The bot will now run 24/7 without keeping your Replit workspace open.

### Alternative Deployment: Railway.app

1. Fork this repository to your GitHub account
2. Visit [Railway.app](https://railway.app) and create a new project
3. Choose "Deploy from GitHub repo"
4. Select your forked repository
5. Add environment variables:
   - `DISCORD_TOKEN`: Your Discord bot token
   - `DATABASE_URL`: Your PostgreSQL connection URL (Railway will create this automatically if you add a PostgreSQL database)
6. Railway will automatically deploy your bot
7. To add a database:
   - Click "New" and select "Database"
   - Choose "PostgreSQL"
   - The `DATABASE_URL` will be automatically added to your environment variables

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
