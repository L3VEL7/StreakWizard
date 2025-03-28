# Streakwiz PostgreSQL Version

A Discord bot that allows tracking user message streaks with advanced features and robust database management. Users can build streaks by sending specific messages and compete on separate leaderboards for each trigger word.

## Features

- 🎯 **Customizable Trigger Words**: Set up multiple words/phrases to track
- 📈 **Streak Tracking**: Track daily streaks for each trigger word
- 🏆 **Streak Streaks**: Track consecutive days of maintaining streaks (optional feature)
- 📊 **Leaderboards**: Compete with other users on server-wide leaderboards
- 👤 **User Profiles**: View detailed statistics about your streaks
- ⚙️ **Server Configuration**: Customize bot settings per server
- 🔒 **Rate Limiting**: Prevent spam with configurable cooldowns
- 🎉 **Milestone Celebrations**: Celebrate streak achievements
- 📝 **Detailed Statistics**: Track server-wide engagement
- 💾 **Robust Database**: PostgreSQL backend with automatic migrations and backups

## Quick Start

1. **Prerequisites**
   - Node.js 16 or higher
   - PostgreSQL database
   - Discord Bot Token

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/L3VEL7/Streakwiz_PostgreSQL_version.git
   cd Streakwiz_PostgreSQL_version

   # Install dependencies
   npm install

   # Set up environment variables
   cp .env.example .env
   # Edit .env with your configuration:
   DISCORD_TOKEN=your_discord_bot_token
   DATABASE_URL=your_postgresql_database_url
   ```

3. **Database Setup**
   ```bash
   # Run database migrations
   npm run migrate
   ```

4. **Start the Bot**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## Bot Setup

After adding the bot to your server:

1. **Admin Configuration**
   - Use `/setup` to configure trigger words (admin only)
   - Use `/setstreak_limit` to configure how often users can update their streaks (admin only)
     - Options: hourly, daily, or none (unlimited)
     - Important: Set this after configuring trigger words
   - Use `/remove` to remove specific trigger words (admin only)
   - Use `/toggle_streakstreak` to enable/disable streak streak tracking (admin only)
   - Use `/reset` to reset streaks for users or trigger words (admin only)
   - Use `/restart` to restart the bot (admin only)

2. **User Commands**
   - Use `/profile` to view your or another user's streak profile
   - Use `/leaderboard` to view rankings for each trigger word
   - Use `/stats` to view server-wide streak statistics
   - Use `/help` to view all available commands

3. **Building Streaks**
   - Users can start building streaks by sending messages that exactly match the trigger words
   - The bot will react with appropriate emojis to confirm streak increments

### Example Setup
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

### Emoji System
The bot uses various emojis to track and celebrate streaks:

1. **Regular Streak Numbers**
   - 1-10: 1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣, 6️⃣, 7️⃣, 8️⃣, 9️⃣, 🔟
   - Above 10: 🔥

2. **Regular Streak Milestones**
   - 10: 🌟 (Glowing Star)
   - 25: ⭐ (Star)
   - 50: 🌙 (Crescent Moon)
   - 100: 🌠 (Comet)
   - 250: 🌌 (Milky Way)
   - 500: 🎯 (Target)
   - 1000: 🏆 (Trophy)

3. **Streak Streak Milestones**
   - 7 days: 📅 (Calendar)
   - 14 days: 📆 (Tear-off Calendar)
   - 30 days: 📊 (Chart)
   - 60 days: 📈 (Chart Increasing)
   - 90 days: 📉 (Chart Decreasing)
   - 180 days: 📋 (Clipboard)
   - 365 days: 📅 (Calendar)

4. **Special Celebrations**
   - 🎉 (Party Popper) for milestone announcements

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

## Configuration

The bot can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| DISCORD_TOKEN | Your Discord bot token | Required |
| DATABASE_URL | PostgreSQL connection URL | Required |
| NODE_ENV | Environment (development/production) | development |
| LOG_LEVEL | Logging level | info |

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

For detailed development guidelines, see [DEVELOPERS.md](DEVELOPERS.md).

## License

This project is licensed under the MIT License with Attribution Requirement.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the following conditions:

- The above copyright notice, this permission notice, and **attribution to the original creator [L3VEL7](https://github.com/L3VEL7)** must be included in all copies or substantial portions of the Software.
- Any modified versions must clearly state that changes were made and must still give appropriate credit to the original creator.

**Disclaimer:** THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Support

If you encounter any issues or have questions, please:
1. Check the [DEVELOPERS.md](DEVELOPERS.md) file for technical details
2. Open an issue in the GitHub repository
3. Contact the maintainers
