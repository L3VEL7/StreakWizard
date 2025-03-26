# Developer Guide

This document provides technical details and guidelines for developers working on the Streakwiz Discord bot.

## Project Structure

```
streakwiz/
├── src/
│   ├── commands/           # Discord bot commands
│   │   ├── help.js
│   │   ├── leaderboard.js
│   │   ├── profile.js
│   │   ├── remove.js
│   │   ├── reset.js
│   │   ├── setup.js
│   │   ├── setstreak_limit.js
│   │   ├── stats.js
│   │   └── toggle_streakstreak.js
│   ├── database/          # Database configuration and models
│   │   ├── config.js     # Database connection configuration
│   │   ├── migrate.js    # Database migration logic
│   │   └── models.js     # Sequelize models
│   ├── storage/          # Data management
│   │   └── streakManager.js
│   ├── utils/           # Utility functions
│   │   └── logger.js    # Winston logger configuration
│   ├── __tests__/      # Test files
│   │   └── streakManager.test.js
│   └── index.js        # Main entry point
├── logs/              # Application logs
├── .env.example      # Example environment variables
├── .eslintrc.json   # ESLint configuration
├── .prettierrc      # Prettier configuration
├── .gitignore      # Git ignore rules
├── package.json    # Project configuration
└── README.md      # Project documentation
```

## Architecture

### Core Components

1. **Command Handler** (`src/commands/`)
   - Each command is a separate module
   - Commands follow a consistent structure
   - Implements permission checks and validation

2. **Database Layer** (`src/database/`)
   - Uses Sequelize ORM
   - Models:
     - `GuildConfig`: Server-specific settings
     - `Streak`: User streak data
   - Includes migration system for schema updates

3. **Streak Manager** (`src/storage/streakManager.js`)
   - Core business logic for streak handling
   - Manages streak updates and validation
   - Handles milestone tracking

4. **Utility Functions** (`src/utils/`)
   - Logging system
   - Common helper functions

### Database Schema

#### GuildConfig
```javascript
{
  guildId: string,          // Discord server ID
  triggerWords: string[],   // List of words that trigger streaks
  streakLimit: string,      // Rate limit for streak updates
  streakStreakEnabled: boolean, // Enable/disable streak streaks
}
```

#### Streak
```javascript
{
  userId: string,           // Discord user ID
  guildId: string,         // Discord server ID
  word: string,            // Trigger word
  count: number,           // Current streak count
  bestStreak: number,      // Highest streak achieved
  streakStreak: number,    // Consecutive days with streaks
  lastUpdate: Date,        // Last streak update timestamp
  lastStreakDate: Date,    // Last streak streak date
}
```

## Development Workflow

### Setting Up Development Environment

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/streakwiz.git
   cd streakwiz
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your development credentials
   ```

3. **Database Setup**
   ```bash
   npm run migrate
   ```

### Development Process

1. **Creating New Features**
   - Create feature branch: `git checkout -b feature/your-feature`
   - Implement changes
   - Add tests
   - Update documentation
   - Submit pull request

2. **Adding New Commands**
   ```javascript
   // src/commands/your-command.js
   module.exports = {
     name: 'command-name',
     description: 'Command description',
     async execute(interaction) {
       // Command logic
     }
   };
   ```

3. **Database Changes**
   - Add new models in `src/database/models.js`
   - Update migration logic in `src/database/migrate.js`
   - Test migration process

### Testing

1. **Running Tests**
   ```bash
   npm test                 # Run all tests
   npm test -- --watch     # Watch mode
   npm test -- --coverage  # Coverage report
   ```

2. **Writing Tests**
   ```javascript
   describe('Feature', () => {
     it('should behave as expected', () => {
       // Test logic
     });
   });
   ```

### Code Style

- ESLint and Prettier are configured
- Run `npm run lint` to check code
- Run `npm run format` to format code
- Follow existing patterns in the codebase

### Logging

```javascript
const logger = require('../utils/logger');

logger.info('Informational message');
logger.error('Error message', { error });
logger.debug('Debug message', { context });
```

### Error Handling

1. **Database Errors**
   ```javascript
   try {
     await database.operation();
   } catch (error) {
     logger.error('Database operation failed', { error });
     throw new Error('Friendly user message');
   }
   ```

2. **Discord API Errors**
   ```javascript
   try {
     await interaction.reply('Message');
   } catch (error) {
     logger.error('Discord API error', { error });
     // Handle gracefully
   }
   ```

## Deployment

### Production Considerations

1. **Environment**
   - Set `NODE_ENV=production`
   - Configure proper logging levels
   - Use production database credentials

2. **Database**
   - Run migrations before deployment
   - Backup data regularly
   - Monitor database performance

3. **Monitoring**
   - Check application logs
   - Monitor Discord API rate limits
   - Track error rates

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Check connection string
   - Verify database credentials
   - Ensure database server is running

2. **Command Registration**
   - Verify command file structure
   - Check Discord application commands
   - Clear command cache if needed

3. **Migration Issues**
   - Backup database before migrations
   - Check migration logs
   - Verify database permissions

## Future Improvements

- [ ] Add rate limiting per guild
- [ ] Implement backup system
- [ ] Add analytics dashboard
- [ ] Improve error handling
- [ ] Add more test coverage
- [ ] Implement caching system 