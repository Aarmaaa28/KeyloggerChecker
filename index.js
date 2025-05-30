import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';
import path from 'path';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

const PATTERNS = 
[
    /(?:(?:require\s*\(\s*(?:['"]requests['"])\s*\)|requests)\s*\.\s*post\b)/gi,
    /\b(?:Content-Type|application\/json)\b/gi,
    /https?:\/\/api\.telegram\.org\/(?:bot|Bot)\d{9,11}:[A-Za-z0-9_-]{35,46}\/(?:send(?:Message|Document|Photo|Audio)|get(?:Updates|Me))(\?[\w-]+(=[\w-]*)?(&[\w-]+(=[\w-]*)?)*)?/gi,
    /https?:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]{60,70}(\/[\w-]+)?/gi,
    /\b(?:send(?:Discord|DiscordData|DiscordWebhook|DiscordWebhooks|Telegram|TelegramMessage|telegramdata|Webhook|Webhooks|Embed(?:ded)?To|MessageTo|To)|post(?:Discord|DiscordWebhook|DiscordWebhooks|Telegram|telegramdata|Data))[A-Za-z0-9_]*\b/gi
];

client.once('ready', () => 
{
    console.clear();
    console.log(`Bot is online as ${client.user.tag}, in ${client.guilds.cache.size} server(s)`);
});

client.on('messageCreate', async (message) => 
{
    if (message.author.bot) return;
    if (!(message.channel.id === "1376723676765884496" || message.channel.type === 1)) return;
    
    const attachment = message.attachments.first();

    if (!message.attachments.size) 
    {
        if (message.channel.id === "1376723676765884496" && message.author.id !== "743437232257368074") 
        {
            await message.delete().catch(() => {});
            message.channel.send('🚫 **Text messages are not allowed here; only file attachments are permitted.**')
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 7000));
        }
        return;
    }
    
    if (!/\.(lua|luac|lua\.txt|luac\.txt)$/i.test(attachment.name)) 
    {
        if (message.channel.id === "1376723676765884496" && message.author.id !== "743437232257368074") 
        {
            await message.delete().catch(() => {});
            message.channel.send('🚫 **Only files with the extensions** `.lua`, `.luac`, `.lua.txt`, **or** `.luac.txt` **are allowed.** Files with other extensions are **not permitted.**')
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 7000));
        }
        if (message.channel.type === 1) 
        {
            message.reply('🚫 **Only files with the extensions** `.lua`, `.luac`, `.lua.txt`, **or** `.luac.txt` **are allowed.** Files with other extensions are **not permitted.**')
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 7000));
        }
        return;
    }

    const tempFile = path.join('./temp', attachment.name.replace(/[^a-z0-9.]/gi, '_'));

    try 
    {
        await fs.mkdir('./temp', { recursive: true });

        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        
        await pipeline(response.body, createWriteStream(tempFile));

        const fileHandle = await fs.open(tempFile, 'r');
        const buffer = Buffer.alloc(1048576);
        const { bytesRead } = await fileHandle.read(buffer, 0, 1048576, 0);
        await fileHandle.close();
        
        let fileContent = buffer.slice(0, bytesRead).toString('utf-8');

        if (!/script_author|function\s+main\(\)|isSampLoaded|isSampAvailable|sampRegisterChatCommand/i.test(fileContent)) 
        {
            const runPython = spawn('python', ['main.py', tempFile]);
        
            await new Promise((resolve) => 
            {
                runPython.on('close', () => resolve());
                setTimeout(resolve, 45000);
            });
        
            if (await fs.access('keyloggerchecker.log').then(() => true).catch(() => false)) 
            {
                fileContent = await fs.readFile('keyloggerchecker.log', 'utf-8');
                await fs.unlink('keyloggerchecker.log');
            }
            else 
            {
                message.reply('❌ **I\'m sorry, but I cannot process the file.**\n\n**I am only capable of handling files that have been obfuscated using `luaobfuscator.com` or non-obfuscated files.**')
                    .then(msg => setTimeout(() => msg.delete().catch(() => {}), 7000));
                return;
            }
        }

        const matches = [...new Set(PATTERNS.flatMap(p => fileContent.match(p) || []))];
        
        const formatFileSize = attachment.size >= 1048576 ? (attachment.size / 1048576).toFixed(2) + ' MB' :
                              attachment.size >= 1024 ? (attachment.size / 1024).toFixed(2) + ' KB' :
                              attachment.size + ' B';

        await message.reply({
            embeds: [{
                title: matches.length ? "🚨 KEYLOGGER DETECTED!" : "✅ FILE IS SAFE",
                description: [
                    `━━━━━━━━━━━━━━━━━━`,
                    `📂 **File:** \`${attachment.name}\``,
                    `📏 **Size:** \`${formatFileSize}\``,
                    `━━━━━━━━━━━━━━━━━━`,
                    matches.length 
                        ? `**🔍 Scan Results (${matches.length} total):**\n\`\`\`\n${matches.map(m => `• ${m}`).join('\n')}\n\`\`\``
                        : `🔍 **There is no presence of a keylogger in the file.**`
                ].join('\n'),
                color: matches.length ? 0xFF0000 : 0x00FF00,
                footer: { text: `A Bot` },
                timestamp: new Date().toISOString()
            }]
        });

    } catch (error) 
    {
        console.error('Processing Error:', error);
    } 
    finally 
    {
        await fs.unlink(tempFile).catch(() => {});
    }
});

client.login("Aarmaaa28");
