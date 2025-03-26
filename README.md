# Streakwiz PostgreSQL Version

A Discord bot that allows tracking user message streaks with advanced features and robust database management.

## Features

- **Streak Tracking**: Track user streaks for specific trigger words
- **Streak Streaks**: Track consecutive days of maintaining streaks (optional feature)
- **Rate Limiting**: Configurable time limits between streak updates
- **Milestones**: Celebrate user achievements at various streak levels
- **Leaderboards**: View rankings for each trigger word
- **User Profiles**: Detailed streak statistics and history
- **Server Statistics**: View server-wide streak analytics
- **Robust Database**: PostgreSQL backend with automatic migrations and backups

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/L3VEL7/Streakwiz_PostgreSQL_version.git
   cd Streakwiz_PostgreSQL_version
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   DATABASE_URL=your_postgresql_database_url
   ```

4. Start the bot:
   ```bash
   node src/index.js
   ```

## Database Migration

The bot includes a robust database migration system that:
- Automatically detects and adds new features
- Creates backups before any database changes
- Handles rollback if migration fails
- Preserves existing data during updates
- Logs all migration steps for debugging

### Migration Safety Features
- Automatic table backups before changes
- Existence checks for tables and columns
- Safe column addition with proper constraints
- Data initialization for new features
- Comprehensive error handling
- Detailed logging system

## Deployment

### Railway.app Deployment

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
   - Use `/toggle_streakstreak` to enable/disable streak streak tracking (admin only)
   - Use `/reset` to reset streaks for users or trigger words (admin only)
   - Use `/profile` to view your or another user's streak profile
   - Use `/leaderboard` to view rankings for each trigger word
   - Use `/stats` to view server-wide streak statistics
   - Use `/help` to view all available commands
   - Users can start building streaks by sending messages that exactly match the trigger words
   - The bot will react with appropriate emojis to confirm streak increments

2. Example Setup:
   ```
   /setup words:daily,workout,study
   /setstreak_limit interval:daily
   /toggle_streakstreak
   /remove words:workout
   ```

## Features in Detail

### Streak Streaks
- Track consecutive days of maintaining streaks
- Special milestones at 7, 14, 30, 60, 90, 180, and 365 days
- Can be enabled/disabled per server
- Shows remaining time until next streak update

### Milestones
- Regular streaks: 10, 25, 50, 100, 250, 500, 1000
- Streak streaks: 7, 14, 30, 60, 90, 180, 365 days
- Special celebrations with unique emojis
- User mentions in milestone messages

### Statistics
- Server-wide streak analytics
- User profiles with detailed history
- Best streak tracking
- Streak streak progress

## License

This project is licensed under the MIT License with Attribution Requirement.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the following conditions:

- The above copyright notice, this permission notice, and **attribution to the original creator [L3VEL7](https://github.com/L3VEL7)** must be included in all copies or substantial portions of the Software.
- Any modified versions must clearly state that changes were made and must still give appropriate credit to the original creator.

**Disclaimer:** THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
