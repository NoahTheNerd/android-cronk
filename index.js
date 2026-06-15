// Require the necessary discord.js classes
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Events, Collection, GatewayIntentBits, MessageFlags } = require('discord.js');
const token = process.env.TOKEN;

const OLD_PEOPLE_CHANNEL_ID = '1506139593479688345';
const OLD_PEOPLE_ROLE_ID = '1503932297462677617';

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
});


// delete messages from THE YOUTHS
client.on(Events.MessageCreate, async (message) => {
	if (!message.inGuild() || message.author.bot) return;
	if (message.channelId !== OLD_PEOPLE_CHANNEL_ID) return;

	const guild = message.guild;
	const restrictedChannel = await guild.channels.fetch(OLD_PEOPLE_CHANNEL_ID).catch(() => null);
	const requiredRole = await guild.roles.fetch(OLD_PEOPLE_ROLE_ID).catch(() => null);

	if (!restrictedChannel || !requiredRole) return;

	const member = await guild.members.fetch(message.author.id).catch(() => null);
	if (!member) return;

	if (member.roles.cache.has(requiredRole.id)) return;

	try {
		if (message.deletable) {
			await message.delete();
		}
	} catch (error) {
		console.error(`failed to delete unauthorized message in ${OLD_PEOPLE_CHANNEL_ID}:`, error);
	}
});

// Log in to Discord with your client's token
client.login(token);
