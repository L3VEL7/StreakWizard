# Streakwiz Bot

A Discord bot that tracks user streaks and provides various streak-related features.

## Features

### Core Streak System
- Track user streaks for custom trigger words
- Automatic streak counting and milestone tracking
- Streak streak system (bonus streaks for maintaining daily streaks)
- Customizable trigger words per server
- Streak statistics and leaderboards

### Gambling System
- Users can gamble a percentage of their streaks on coin flips
- Configurable success chance and maximum gamble percentage
- Minimum streak requirements
- Transaction-based updates for safety
- Anti-exploit protection

### Raid System
- Users can challenge others' streaks
- Configurable settings:
  - Maximum steal percentage
  - Risk percentage
  - Success chance
  - Cooldown period
- Safety features:
  - Rate limiting
  - Anti-exploit protection
  - Suspicious activity detection
  - Minimum streak requirements

### Safety Features
- Rate limiting for all commands
- Transaction-based updates
- Input validation
- Detailed logging
- Confirmation steps for destructive actions
- Data preservation warnings
- Anti-exploit measures

## Commands

### User Commands
- `/streak` - View your current streak count
- `/stats` - View your streak statistics
- `/gamble` - Gamble a percentage of your streaks
- `/raid` - Challenge another user's streaks

### Admin Commands
- `/setup` - Set up a new trigger word for streaks
- `/remove` - Remove a trigger word from streak tracking
- `/reset` - Reset a user's streak count
- `/toggle_streakstreak` - Enable/disable streak streak tracking
- `/togglegambling` - Enable/disable the gambling feature
- `/configraid` - Configure raid settings
- `/restart` - Restart the bot

## Safety Measures

### Input Validation
- Length limits for trigger words (100 chars) and descriptions (500 chars)
- Character validation for trigger words
- Minimum streak requirements
- Rate limiting per user and per command

### Data Protection
- Transaction-based updates
- Confirmation steps for destructive actions
- Data preservation warnings
- Detailed logging of all actions

### Anti-Exploit Protection
- Rate limiting
- Suspicious activity detection
- Minimum streak requirements for gambling and raids
- Cooldown periods for high-risk actions

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables:
   ```
   DISCORD_TOKEN=your_bot_token
   DATABASE_URL=your_database_url
   ```
4. Start the bot: `npm start`

## Configuration

### Trigger Words
- Maximum length: 100 characters
- Allowed characters: letters, numbers, spaces, and hyphens
- Case-insensitive matching
- Custom descriptions per word

### Gambling Settings
- Success chance (default: 50%)
- Maximum gamble percentage (default: 50%)
- Minimum streak requirement (default: 2)

### Raid Settings
- Maximum steal percentage (default: 50%)
- Risk percentage (default: 25%)
- Success chance (default: 50%)
- Cooldown period (default: 24 hours)

## Support

For support, please join our [Discord server](https://discord.gg/your-invite) or create an issue in the repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
