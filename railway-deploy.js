/**
 * Railway Deployment Script
 * 
 * This script will:
 * 1. Register all slash commands
 * 2. Start the bot
 * 
 * To use in Railway, set the START command to:
 * node railway-deploy.js
 */

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Check if we have the required environment variables
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error('Missing required environment variables (DISCORD_TOKEN or CLIENT_ID)');
    process.exit(1);
}

console.log('=== RAILWAY DEPLOYMENT SCRIPT ===');
console.log('Starting deployment process...');

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register commands globally
async function registerCommands() {
    try {
        console.log('Loading command files...');
        const commands = [];
        const commandsPath = path.join(__dirname, 'src', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        // Special handling for problematic commands
        const priorityCommands = ['remove.js', 'reload.js', 'resetdata.js'];
        console.log('⭐ Priority registering problematic commands first:');
        
        // First load and register priority commands
        for (const file of priorityCommands) {
            const filePath = path.join(commandsPath, file);
            
            // Skip if file doesn't exist
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ Priority command file not found: ${file}`);
                continue;
            }
            
            try {
                const command = require(filePath);

                // Validate command structure
                if (!command.data || !command.data.toJSON) {
                    console.warn(`⚠️ The command at ${file} is missing required properties. Skipping.`);
                    continue;
                }

                // Add command to array
                commands.push(command.data.toJSON());
                console.log(`✅ Loaded priority command: ${command.data.name}`);
                
                // Log command structure for debugging
                const commandData = command.data.toJSON();
                console.log(`   Command structure: ${commandData.name}`);
                if (commandData.options) {
                    commandData.options.forEach(option => {
                        console.log(`   - Option: ${option.name} (${option.type}) Required: ${option.required}`);
                    });
                }
            } catch (error) {
                console.error(`❌ Failed to load priority command ${file}:`, error);
            }
        }
        
        // Then load all other commands
        console.log('\nLoading remaining commands:');
        for (const file of commandFiles) {
            // Skip priority commands as they're already loaded
            if (priorityCommands.includes(file)) {
                continue;
            }
            
            try {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);

                // Validate command structure
                if (!command.data || !command.data.toJSON) {
                    console.warn(`⚠️ The command at ${file} is missing required properties. Skipping.`);
                    continue;
                }

                // Add command to array
                commands.push(command.data.toJSON());
                console.log(`✅ Loaded command: ${command.data.name}`);
            } catch (error) {
                console.error(`❌ Failed to load command ${file}:`, error);
            }
        }

        console.log(`Total commands loaded: ${commands.length}`);

        // Register commands globally - makes them available in all servers (may take up to 1 hour)
        console.log('Registering global commands... (this may take up to 1 hour to complete)');
        const globalResponse = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        
        console.log(`Successfully registered ${globalResponse.length} global commands!`);
        console.log('\nRegistered commands:');
        if (globalResponse.length > 0) {
            globalResponse.forEach(cmd => {
                console.log(`- ${cmd.name}`);
            });
        }

        return true;
    } catch (error) {
        console.error('Error during command registration:', error);
        
        if (error.code === 50001) {
            console.error('\nMISSING ACCESS ERROR: The bot doesn\'t have permission to manage commands.');
            console.log('\nPossible solutions:');
            console.log('1. Make sure the bot has the "applications.commands" scope');
            console.log('2. Make sure the bot has appropriate permissions');
        }
        
        return false;
    }
}

// Start the bot
function startBot() {
    console.log('\n=== STARTING BOT ===');
    // Execute the normal bot startup
    const botProcess = exec('node src/index.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Bot process error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Bot stderr: ${stderr}`);
        }
    });

    // Pipe output to console
    botProcess.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    // Handle process exit
    botProcess.on('exit', (code) => {
        console.log(`Bot process exited with code ${code}`);
        process.exit(code);
    });

    // Forward signals to child process
    process.on('SIGINT', () => {
        botProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
        botProcess.kill('SIGTERM');
    });
}

// Run the deployment process
async function deploy() {
    try {
        // Register commands
        const success = await registerCommands();
        
        if (success) {
            console.log('Command registration completed successfully.');
        } else {
            console.warn('Command registration had issues. Bot will start anyway.');
        }

        // Start the bot regardless of registration result
        startBot();
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

// Start the deployment
deploy(); 