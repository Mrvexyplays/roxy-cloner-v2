const origLog = console.log;
console.log = () => { };
require('dotenv').config();
console.log = origLog;

process.removeAllListeners('warning');

const { Client: BotClient, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, REST, Routes } = require('discord.js');
const { Client: UserClient } = require('discord.js-selfbot-v13');

const bot = new BotClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const userClient = new UserClient({
    checkUpdate: false
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const DC_TOKEN = process.env.DC_TOKEN;
const ALLOWED_ID = process.env.ALLOWED_ID;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const purple = '\x1b[35m';
const reset = '\x1b[0m';

console.clear();
console.log(purple + `
 ██╗   ██╗███████╗██╗  ██╗██╗   ██╗
 ██║   ██║██╔════╝╚██╗██╔╝╚██╗ ██╔╝
 ██║   ██║█████╗   ╚███╔╝  ╚████╔╝ 
 ╚██╗ ██╔╝██╔══╝   ██╔██╗   ╚██╔╝  
  ╚████╔╝ ███████╗██╔╝ ██╗   ██║   
   ╚═══╝  ╚══════╝╚═╝  ╚═╝   ╚═╝   
` + reset);

// Slash Commands Register karne ka function
async function registerSlashCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

        const commands = [
            {
                name: 'clone',
                description: 'Clone a server',
                options: [
                    {
                        name: 'source',
                        description: 'Source server ID',
                        type: 3,
                        required: true
                    },
                    {
                        name: 'target',
                        description: 'Target server ID',
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: 'deleteallchannels',
                description: 'Category ke saare channels delete karo'
            },
            {
                name: 'deleterole',
                description: 'Ek specific role delete karo',
                options: [
                    {
                        name: 'role',
                        description: 'Role ka naam ya ID',
                        type: 3,
                        required: true
                    }
                ]
            }
        ];

        console.log(purple + 'Slash commands register ho rahe hain...' + reset);
        await rest.put(
            Routes.applicationCommands(bot.user.id),
            { body: commands }
        );
        console.log(purple + 'Slash commands register ho gaye!' + reset);
    } catch (error) {
        console.error('Slash commands register error:', error);
    }
}

bot.once('ready', () => {
    console.log(purple + `Bot logged in as ${bot.user.tag}` + reset);
    registerSlashCommands();
});

userClient.once('ready', () => {
    console.log(purple + `User Client logged in as ${userClient.user.tag}` + reset);
});

// Slash Commands handle karne ka function
bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.user.id !== ALLOWED_ID) {
        return interaction.reply({ content: '❌ **Tujhe permission nahi hai behenchod!**', ephemeral: true });
    }

    const { commandName, options } = interaction;

    // ==================== !clone ka slash version ====================
    if (commandName === 'clone') {
        await interaction.deferReply();

        const sourceId = options.getString('source');
        const targetId = options.getString('target');

        if (sourceId === targetId) {
            return interaction.editReply("Source and Target server IDs cannot be the same.");
        }

        const sourceGuild = userClient.guilds.cache.get(sourceId);
        if (!sourceGuild) {
            return interaction.editReply("I can't access the source server from the user account. Make sure the user account is in that server.");
        }

        const targetGuild = bot.guilds.cache.get(targetId);
        if (!targetGuild) {
            return interaction.editReply("The bot is not in the target server.");
        }

        const botMember = await targetGuild.members.fetch(bot.user.id);
        if (!botMember.permissions.has('Administrator')) {
            return interaction.editReply("The bot does not have Administrator permission in the target server. Please grant Administrator permission to the bot role.");
        }

        const highestRolePos = Math.max(...targetGuild.roles.cache.map(r => r.position));
        if (botMember.roles.highest.position < highestRolePos) {
            return interaction.editReply("The bot's role is not at the top of the role list. Please go to Server Settings -> Roles, and drag the bot's role to the very top.");
        }

        const embed = new EmbedBuilder()
            .setTitle("VEXY Cloner V2 Setup")
            .setDescription(`Cloning from **${sourceGuild.name}** to **${targetGuild.name}**\n\n` +
                `**1.** Delete Existing Channels\n` +
                `**2.** Delete Existing Roles\n` +
                `**3.** Delete Emojis\n` +
                `**4.** Clone Channels\n` +
                `**5.** Clone Roles\n` +
                `**6.** Clone Emojis`)
            .setColor('#800080');

        let optionsObj = {
            1: false,
            2: false,
            3: false,
            4: false,
            5: false,
            6: false
        };

        const createRow = (startIndex, endIndex) => {
            const row = new ActionRowBuilder();
            for (let i = startIndex; i <= endIndex; i++) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`opt_${i}`)
                        .setLabel(`${i}`)
                        .setStyle(optionsObj[i] ? ButtonStyle.Success : ButtonStyle.Danger)
                );
            }
            return row;
        };

        const row1 = createRow(1, 4);
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('opt_5')
                    .setLabel('5')
                    .setStyle(optionsObj[5] ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('opt_6')
                    .setLabel('6')
                    .setStyle(optionsObj[6] ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('start_clone')
                    .setLabel('Start Cloning')
                    .setStyle(ButtonStyle.Primary)
            );

        const replyMsgs = await interaction.editReply({ embeds: [embed], components: [row1, row2] });

        const collector = replyMsgs.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000
        });

        collector.on('collect', async i => {
            if (i.customId.startsWith('opt_')) {
                const optNum = parseInt(i.customId.split('_')[1]);
                optionsObj[optNum] = !optionsObj[optNum];

                const newRow1 = createRow(1, 4);
                const newRow2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('opt_5')
                            .setLabel('5')
                            .setStyle(optionsObj[5] ? ButtonStyle.Success : ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('opt_6')
                            .setLabel('6')
                            .setStyle(optionsObj[6] ? ButtonStyle.Success : ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('start_clone')
                            .setLabel('Start Cloning')
                            .setStyle(ButtonStyle.Primary)
                    );

                await i.update({ components: [newRow1, newRow2] });
            } else if (i.customId === 'start_clone') {
                collector.stop('started');
                await i.update({ components: [] });
                await interaction.followUp("Starting cloning process in 3 seconds...");
                await delay(3000);
                startCloningProcess(interaction, sourceGuild, targetGuild, optionsObj);
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'started') {
                replyMsgs.edit({ content: "Cloning menu timed out.", components: [] }).catch(() => { });
            }
        });
    }

    // ==================== /deleteallchannels ====================
    else if (commandName === 'deleteallchannels') {
        await interaction.deferReply();

        try {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply('❌ **Tere paas ADMINISTRATOR permission nahi hai behenchod!**');
            }

            const guild = interaction.guild;
            const categories = guild.channels.cache.filter(c => c.type === 4).map(c => c);

            if (categories.length === 0) {
                return interaction.editReply('❌ **Koi category nahi hai! Pehle category bana madarchod.**');
            }

            let categoryList = '';
            categories.forEach((cat, index) => {
                const channelCount = cat.children.cache.size;
                categoryList += `**${index + 1}.** ${cat.name} - ${channelCount} channels\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('🗑️ **CATEGORY SELECT KAR**')
                .setDescription(`Kaunsi category ke saare channels delete karne hain?\n\n${categoryList}\n\n📝 **1 se ${categories.length} tak number likh**`)
                .setColor(0xFF0000)
                .setFooter({ text: '60 second mein number dal vrna cancel' });

            await interaction.editReply({ embeds: [embed] });

            const filter = m => m.author.id === interaction.user.id;
            
            const collected = await interaction.channel.awaitMessages({
                filter,
                max: 1,
                time: 60000,
                errors: ['time']
            });

            const response = collected.first();
            const choice = parseInt(response.content) - 1;

            if (isNaN(choice) || choice < 0 || choice >= categories.length) {
                return interaction.followUp('❌ **Galat number! Command phir se chal.**');
            }

            const selectedCategory = categories[choice];
            const channelsToDelete = selectedCategory.children.cache;

            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ **CONFIRM KAR**')
                .setDescription(`Category **${selectedCategory.name}** ke **${channelsToDelete.size} channels** delete karne ka confirm hai?\n\n✅ \`yes\` likh confirm karne ke liye\n❌ \`no\` likh cancel karne ke liye`)
                .setColor(0xFFAA00);

            await interaction.followUp({ embeds: [confirmEmbed] });

            const confirmFilter = m => m.author.id === interaction.user.id && 
                                     ['yes', 'no', 'y', 'n'].includes(m.content.toLowerCase());
            
            const confirmCollected = await interaction.channel.awaitMessages({
                filter: confirmFilter,
                max: 1,
                time: 30000,
                errors: ['time']
            });

            const confirmResponse = confirmCollected.first();
            
            if (['yes', 'y'].includes(confirmResponse.content.toLowerCase())) {
                const statusMsg = await interaction.followUp('🔄 **Delete ho rahe hain...**');
                
                let deleted = 0;
                let failed = 0;

                for (const [id, channel] of channelsToDelete) {
                    try {
                        await channel.delete();
                        deleted++;
                        await delay(500);
                    } catch (error) {
                        console.error(`Channel delete failed: ${error}`);
                        failed++;
                    }
                }

                const resultEmbed = new EmbedBuilder()
                    .setTitle('✅ **KAAM HO GAYA!**')
                    .setDescription(`Category: **${selectedCategory.name}**\n` +
                               `✅ Deleted: ${deleted} channels\n` +
                               `❌ Failed: ${failed} channels`)
                    .setColor(0x00FF00);

                await statusMsg.edit({ embeds: [resultEmbed] });
                
            } else {
                await interaction.followUp('❌ **Cancel kar diya!**');
            }

        } catch (error) {
            if (error.message === 'time') {
                return interaction.followUp('⏰ **Time over! Phir se command chal.**');
            }
            console.error('Delete channels error:', error);
            return interaction.followUp(`❌ **Error:** ${error.message}`);
        }
    }

    // ==================== /deleterole ====================
    else if (commandName === 'deleterole') {
        await interaction.deferReply();

        try {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply('❌ **Tere paas ADMINISTRATOR permission nahi hai behenchod!**');
            }

            const roleInput = options.getString('role');
            const guild = interaction.guild;

            // Role find karo - ID se ya name se
            let role = null;
            
            // Pehle ID se try karo
            if (roleInput.match(/^[0-9]{17,19}$/)) {
                role = guild.roles.cache.get(roleInput);
            }
            
            // Agar ID se nahi mila toh name se search karo
            if (!role) {
                role = guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
            }

            // Agar fir bhi nahi mila toh partial match try karo
            if (!role) {
                role = guild.roles.cache.find(r => r.name.toLowerCase().includes(roleInput.toLowerCase()));
            }

            if (!role) {
                return interaction.editReply('❌ **Role nahi mila behenchod! Sahi naam ya ID daal.**');
            }

            // Check karo ki role delete ho sakta hai ya nahi
            if (role.name === '@everyone') {
                return interaction.editReply('❌ **@everyone role delete nahi kar sakta madarchod!**');
            }

            if (role.managed) {
                return interaction.editReply('❌ **Ye bot/admin managed role hai, delete nahi kar sakta!**');
            }

            if (!role.editable) {
                return interaction.editReply('❌ **Ye role delete nahi kar sakta! Role position check kar.**');
            }

            // Confirmation le
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ **CONFIRM KAR**')
                .setDescription(`Role **${role.name}** (ID: ${role.id}) delete karne ka confirm hai?\n\n✅ \`yes\` likh confirm karne ke liye\n❌ \`no\` likh cancel karne ke liye`)
                .setColor(0xFFAA00);

            await interaction.editReply({ embeds: [confirmEmbed] });

            const filter = m => m.author.id === interaction.user.id && 
                               ['yes', 'no', 'y', 'n'].includes(m.content.toLowerCase());
            
            const collected = await interaction.channel.awaitMessages({
                filter,
                max: 1,
                time: 30000,
                errors: ['time']
            });

            const response = collected.first();
            
            if (['yes', 'y'].includes(response.content.toLowerCase())) {
                // Role delete karo
                await role.delete();
                
                const resultEmbed = new EmbedBuilder()
                    .setTitle('✅ **ROLE DELETE HO GAYA!**')
                    .setDescription(`Role **${role.name}** successfully delete ho gaya!`)
                    .setColor(0x00FF00);

                await interaction.followUp({ embeds: [resultEmbed] });
                
            } else {
                await interaction.followUp('❌ **Cancel kar diya!**');
            }

        } catch (error) {
            if (error.message === 'time') {
                return interaction.followUp('⏰ **Time over! Phir se command chal.**');
            }
            console.error('Delete role error:', error);
            return interaction.followUp(`❌ **Error:** ${error.message}`);
        }
    }
});

// Purana message command bhi rakh sakte ho agar chahte ho, ya hata do
bot.on('messageCreate', async (message) => {
    if (message.author.bot || message.author.id !== ALLOWED_ID) return;
    
    // Agar sirf slash commands chahiye toh yeh puri function hata do
    // Ya rakhna chahte ho toh yahan code daalo
});

async function startCloningProcess(interaction, sourceGuild, targetGuild, opts) {
    let logChannelId = interaction.channel.id;
    let logGuildId = interaction.guild?.id;

    async function sendLog(text) {
        try {
            const currentChannel = bot.channels.cache.get(logChannelId);
            if (logGuildId === targetGuild.id && opts[1]) {
                if (currentChannel) {
                    await currentChannel.send({ content: text }).catch(() => { });
                } else {
                    await interaction.user.send(`[Cloning Log] ${text}`).catch(() => { });
                }
            } else {
                if (currentChannel) {
                    await currentChannel.send({ content: text }).catch(() => { });
                } else {
                    await interaction.user.send(`[Cloning Log] ${text}`).catch(() => { });
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    await sendLog("Starting deletion process...");

    if (opts[1]) {
        const channels = targetGuild.channels.cache.filter(ch => ch.deletable);
        for (const [id, channel] of channels) {
            try {
                if (channel.id === logChannelId) continue;
                await channel.delete();
                await delay(1500);
            } catch { }
        }
        if (channels.has(logChannelId)) {
            const currentChannel = bot.channels.cache.get(logChannelId);
            if (currentChannel && currentChannel.deletable) {
                await interaction.user.send("Channel deleted. Continuing logs here...").catch(() => { });
                await currentChannel.delete().catch(() => { });
            }
        }
    }

    if (opts[2]) {
        const roles = targetGuild.roles.cache.filter(role => role.name !== '@everyone' && !role.managed && role.editable);
        for (const [id, role] of roles) {
            try {
                await role.delete();
                await delay(1500);
            } catch { }
        }
    }

    if (opts[3]) {
        const emojis = targetGuild.emojis.cache.filter(e => e.deletable);
        for (const [id, emoji] of emojis) {
            try {
                await emoji.delete();
                await delay(1500);
            } catch { }
        }
    }

    await sendLog("Cleanup complete. Starting cloning...");

    const roleMapping = new Map();

    if (opts[5]) {
        const targetEveryone = targetGuild.roles.everyone;
        const sourceEveryone = sourceGuild.roles.everyone;
        if (targetEveryone && sourceEveryone) {
            roleMapping.set(sourceEveryone.id, targetEveryone.id);
        }

        co
