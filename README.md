# Streakwiz Discord Bot

A powerful Discord bot for tracking and celebrating streaks with advanced features like gambling, raids, achievements, and more.

## 📋 Features

### Core Features
- **Streak Tracking**: Track streaks for customizable trigger words
- **Streak Streak**: Track how many consecutive days users maintain their streaks
- **Milestones**: Celebrate when users reach specific streak levels
- **Achievements**: Award special achievements for various accomplishments

### Enhanced Features
- **Raid System**: Users can raid each other's streaks to steal or lose streaks
- **Gambling System**: Users can gamble their streaks for a chance to win more

### Administrative Features
- **Interactive Configuration Panel**: Easy-to-use setup interface for all features
- **Per-server Configuration**: Customize the bot differently for each server
- **Advanced Customization**: Set parameters like success rates, limits, cooldowns, etc.

## 🆕 Recent Updates

### Command Registration Improvements
- Added SKIP_REGISTRATION option to bypass registration when needed
- Implemented timeout protection and better error handling
- Added `toggledevmode` command for switching between development and production

### Public Command Outputs
- Modified `gamble`, `raid`, `leaderboard`, and `stats` commands to use public outputs
- Enhanced visibility with user mentions and improved formatting

### Raid System Overhaul
- **Defender Reward System**: Failed raiders now lose streaks to defenders
- **Hybrid Percentage/Fixed Value System**:
  - Steal amount: 20% of defender's streaks (min 5, max 30)
  - Risk amount: 15% of attacker's streaks (min 3, max 20)
  - Success chance based on multiple factors (see below)
  - Variable cooldowns: 4 hours after success, 2 hours after failure
  - Lowered entry barrier to 25% of target's streaks or at least 10 streaks
- **Dynamic Difficulty System**:
  - Automatic adjustments from -15% to +15% based on streak ratio
  - Target value bonus: +3% to +15% based on target's streak size
  - Final success chances range from ~35% to ~75%
- **Underdog Reward System**:
  - Steal bonuses: +10% to +25% increased max steal for underdogs
  - Risk reduction: 20% to 60% risk reduction when failing
- **Interactive Raid Results**:
  - Detailed difficulty rating (Very Hard to Very Easy) 
  - Success chance displayed with decimal precision
  - Clear indication of underdog bonuses and protections
  - Visual indicators for raid difficulty
- **Comprehensive Configuration UI** in setup-embed for all raid parameters
- **Improved Error Messages** for clarity on why raids might fail

### Leaderboard Improvements
- Updated to show proper usernames instead of user IDs
- Enhanced visual formatting with medals and proper numbering

## 🚀 Getting Started

### Prerequisites
- Node.js 16.9.0 or higher
- PostgreSQL database
- Discord bot token

### Environment Setup
Create a `.env` file in the root directory with:
```
DISCORD_TOKEN=your_discord_bot_token
DATABASE_URL=postgresql://username:password@localhost:5432/streakwiz
```

### Installation
1. Clone this repository
2. Install dependencies: `npm install`
3. Start the bot: `node src/index.js`

### Bot Permissions
When adding the bot to your server, ensure it has these permissions:
- Read & Send Messages
- Embed Links
- Add Reactions
- Use Slash Commands

## 🔧 Configuration Commands

### `/setup-embed` - Interactive Configuration Panel
The main configuration command that provides an interactive panel with all options.
- Accessible only to server administrators
- Contains configurations for:
  - Core Features (trigger words, streak limits, etc.)
  - Raid System (toggle, percentages, cooldowns)
  - Gambling System (toggle, percentages, minimum requirements)

### Other Configuration Commands
- `/togglegambling` - Quick toggle for the gambling system
- `/toggle_streakstreak` - Toggle the streak streak feature
- `/configraid` - Configure raid system parameters
- `/setstreak_limit` - Set how often users can update their streaks (in hours, converted to minutes)
- `/toggledevmode` - Switch between development and production modes

## 📈 User Commands

### Streak Management
- `/profile [user]` - View your or another user's streak profile
- `/leaderboard [word]` - See the server's streak leaderboard
- `/stats [user]` - View detailed statistics about streaks
- `/reset [word]` - Reset your streak for a specific trigger word

### Gambling System
- `/gamble [word] [amount]` - Gamble your streaks for a chance to win more
  - Parameters:
    - `word` - The trigger word to gamble with
    - `amount` - How many streaks to gamble

### Raid System
- `/raid [user] [word]` - Raid another user's streak
  - Parameters:
    - `user` - The user to raid
    - `word` - The trigger word to raid
  - Success results in stealing streaks from the target
  - Failure results in losing streaks which are given to the defender as a bonus
  - Progressive bonus chance based on target's streak size
  - Initiator bonus gives attackers a slight advantage
  - Underdog bonuses when raiding higher-ranked players (more to gain, less to lose)

## ⚙️ Configurable Parameters

### Core Parameters
- **Trigger Words**: Words that trigger streak updates
- **Streak Limit**: Time cooldown between streak updates (in hours, stored as minutes)
- **Streak Streak**: Enable/disable tracking consecutive days

### Raid System Parameters
- **Enabled/Disabled**: Toggle the entire raid system
- **Base Success Chance**: Base probability of successful raids (default: 50%)
- **Dynamic Difficulty System**: 
  - Automatic adjustments from -15% to +15% based on streak ratio
  - Target value bonus: +3% to +15% based on target's streak size
  - Final success chances range from ~35% to ~75%
- **Underdog Reward System**:
  - Steal bonuses: +10% to +25% increased max steal for underdogs
  - Risk reduction: 20% to 60% risk reduction when failing
- **Max Steal Percentage**: Maximum amount that can be stolen (default: 20%)
- **Risk Percentage**: How much you risk losing on a failed raid (default: 15%)
- **Min/Max Steal Amount**: Limits on how much can be stolen (default: 5-30)
- **Min/Max Risk Amount**: Limits on how much can be lost (default: 3-20)
- **Success Cooldown**: Hours between raid attempts after success (default: 4h)
- **Failure Cooldown**: Hours between raid attempts after failure (default: 2h)

### Gambling System Parameters
- **Enabled/Disabled**: Toggle the entire gambling system
- **Success Chance**: Probability of winning gambles (default: 50%)
- **Max Gamble Percentage**: Maximum amount that can be gambled (default: 50%)
- **Min Streak Requirement**: Minimum streaks needed to gamble (default: 10)

## 🪄 Examples

### Example 1: Setting up the bot
1. Run `/setup-embed` to open the configuration panel
2. Select "Core Features" and configure trigger words
3. Toggle "Raid System" and "Gambling System" as desired
4. Adjust parameters to suit your server's needs

### Example 2: User commands
- A user can check their streaks: `/profile`
- They can gamble some streaks: `/gamble daily 5`
- They can raid another user: `/raid @SomeUser daily`

### Example 3: Raid Mechanics
- Different raids have different difficulty levels, from Very Hard to Very Easy
- Success chances range from ~35% for very challenging raids to ~75% for easy ones
- Raids show detailed information about difficulty, bonuses, and risk reductions
- The raid system is designed to create strategic choices for players at all levels
- Failed raids result in streaks being transferred from attacker to defender

### Example 4: Strategic Raid Scenarios
- **Balanced Raid** (1:1 ratio):
  - Player with 50 streaks raids someone with 50 streaks
  - Base chance (50%) + Initiator bonus (5%) + Target value bonus (9%) = 64% success chance
  - Normal steal and risk amounts apply
  - Labeled as "Balanced" difficulty

- **Challenging Raid** (0.6:1 ratio):
  - Player with 30 streaks raids someone with 50 streaks
  - Base (50%) + Initiator (5%) - Underdog penalty (10%) + Target value (9%) = 54% success chance
  - +15% max steal bonus for being a moderate underdog
  - 40% risk reduction if they fail
  - Labeled as "Hard" difficulty

- **Very Hard Raid** (0.3:1 ratio):
  - Player with 30 streaks raids someone with 100 streaks
  - Base (50%) + Initiator (5%) - Underdog penalty (15%) + Target value (15%) = 55% success chance
  - +25% max steal bonus for being a significant underdog
  - 60% risk reduction if they fail
  - Higher risk but with greater potential rewards
  - Labeled as "Very Hard" difficulty

- **Easy Raid** (2:1 ratio):
  - Player with 100 streaks raids someone with 50 streaks
  - Base (50%) + Initiator (5%) + Overdog bonus (15%) + Target value (9%) = 79% success chance
  - -5% steal amount penalty for having a significant advantage
  - No risk reduction if they fail
  - Labeled as "Very Easy" difficulty

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🧩 Acknowledgements
- Discord.js for the powerful Discord API wrapper
- PostgreSQL for reliable database storage
- All contributors who have helped improve the bot
