# Developer Guide - Streakwiz PostgreSQL Version

This guide provides detailed information about the bot's architecture, codebase structure, and development guidelines for contributors.

## Project Structure

```
Streakwiz_PostgreSQL_version/
├── src/
│   ├── commands/           # Discord slash commands
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
│   │   ├── config.js      # Sequelize configuration
│   │   └── models.js      # Database models and migrations
│   ├── storage/          # Data access layer
│   │   └── streakManager.js
│   └── index.js          # Main bot entry point
├── .env                  # Environment variables
├── package.json
└── README.md
```

## Architecture Overview

### Core Components

1. **Command Handler (`src/commands/`)**
   - Implements Discord slash commands
   - Each command is a separate module
   - Follows a consistent structure with `data` and `execute` functions
   - Handles user interactions and permissions

2. **Database Layer (`src/database/`)**
   - Uses Sequelize ORM for PostgreSQL
   - Models define data structure and relationships
   - Includes migration system for database updates
   - Handles data persistence and retrieval

3. **Storage Manager (`src/storage/streakManager.js`)**
   - Business logic layer
   - Handles streak calculations and updates
   - Manages streak streaks and milestones
   - Provides data access abstraction

4. **Main Bot (`src/index.js`)**
   - Initializes Discord client
   - Loads commands
   - Handles message events
   - Manages bot lifecycle

### Database Schema

1. **GuildConfig Model**
   ```javascript
   {
     guildId: string (primary key),
     triggerWords: string[],
     streakLimit: integer,
     streakStreakEnabled: boolean
   }
   ```

2. **Streak Model**
   ```javascript
   {
     id: integer (primary key),
     guildId: string,
     userId: string,
     triggerWord: string,
     count: integer,
     bestStreak: integer,
     streakStreak: integer,
     lastStreakDate: date,
     lastUpdated: date
   }
   ```

## Development Guidelines

### Adding New Commands

1. Create a new file in `src/commands/`
2. Follow the command structure:
   ```javascript
   module.exports = {
     data: new SlashCommandBuilder()
       .setName('command_name')
       .setDescription('Command description')
       .addOption(/* options */),
     
     async execute(interaction) {
       // Command logic
     }
   };
   ```

### Database Changes

1. **Adding New Fields**
   - Update the model in `models.js`
   - Add migration logic in `migrateDatabase()`
   - Include rollback procedures
   - Test with existing data

2. **Modifying Existing Fields**
   - Create backup before changes
   - Update both model and migration
   - Handle data conversion if needed

### Error Handling

1. **Command Errors**
   ```javascript
   try {
     await command.execute(interaction);
   } catch (error) {
     console.error(error);
     await interaction.reply({
       content: 'There was an error executing this command!',
       ephemeral: true
     });
   }
   ```

2. **Database Errors**
   - Use try-catch blocks
   - Log errors with context
   - Implement rollback mechanisms
   - Provide user-friendly error messages

### Testing

1. **Local Testing**
   - Use a test Discord server
   - Create a test database
   - Test all command variations
   - Verify error handling

2. **Database Testing**
   - Test migrations
   - Verify data integrity
   - Check rollback procedures
   - Test with large datasets

## Common Patterns

### Message Handling
```javascript
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  // Process message
});
```

### Command Structure
```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('command')
    .setDescription('Description'),
  
  async execute(interaction) {
    await interaction.deferReply();
    // Command logic
    await interaction.editReply('Result');
  }
};
```

### Database Operations
```javascript
// Find or create
const [record, created] = await Model.findOrCreate({
  where: { /* conditions */ },
  defaults: { /* default values */ }
});

// Update with safety
await record.update({
  field: value
}, {
  where: { /* conditions */ }
});
```

## Contributing

1. **Fork the Repository**
   - Create a feature branch
   - Make your changes
   - Test thoroughly
   - Submit a pull request

2. **Code Style**
   - Use consistent formatting
   - Add comments for complex logic
   - Follow existing patterns
   - Update documentation

3. **Testing**
   - Test all new features
   - Verify backward compatibility
   - Check error handling
   - Test database migrations

4. **Documentation**
   - Update README.md if needed
   - Document new commands
   - Explain complex logic
   - Update this guide

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Check DATABASE_URL in .env
   - Verify PostgreSQL is running
   - Check network connectivity
   - Review error logs

2. **Command Registration**
   - Verify command structure
   - Check permissions
   - Review Discord API limits
   - Check bot token

3. **Migration Issues**
   - Review migration logs
   - Check backup tables
   - Verify data integrity
   - Test rollback procedures

## Future Improvements

1. **Potential Features**
   - Custom milestone levels
   - Advanced statistics
   - Streak categories
   - Challenge system

2. **Technical Improvements**
   - Caching layer
   - Rate limiting
   - Performance optimization
   - Enhanced error handling

3. **Documentation**
   - API documentation
   - More examples
   - Troubleshooting guide
   - Development tutorials 