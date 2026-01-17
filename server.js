require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// --- 配置區 ---
// ⚠️ 請務必使用你 Reset 過後的新 Token
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let messageCache = [];

client.once('ready', async () => {
    console.log(`✅ Discord Bot 已上線: ${client.user.tag}`);
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const messages = await channel.messages.fetch({ limit: 50 });
        messageCache = messages.map(m => ({
            id: m.id,
            author: m.author.username,
            avatar: m.author.displayAvatarURL(),
            content: m.content,
            timestamp: m.createdAt
        }));
        console.log(`📊 已成功載入 ${messageCache.length} 條歷史訊息`);
    } catch (err) {
        console.error("❌ 無法抓取歷史訊息，請檢查 CHANNEL_ID 是否正確。");
    }
});

// --- 核心收發邏輯 ---
client.on('messageCreate', (message) => {
    // 1. 無差別偵錯：只要有訊息就印出來，幫你確認 ID
    console.log(`[偵錯] 收到訊息: "${message.content}" | 來自: ${message.author.username} | 頻道ID: ${message.channelId}`);

    // 2. 篩選邏輯
    if (message.channelId === CHANNEL_ID && !message.author.bot) {
        const msgData = {
            id: message.id,
            author: message.author.username,
            avatar: message.author.displayAvatarURL(),
            content: message.content,
            timestamp: message.createdAt
        };

        messageCache.unshift(msgData);
        if (messageCache.length > 100) messageCache.pop();

        // 發送給前端網頁
        io.emit('new_message', msgData);
        console.log(`✨ 匹配成功！訊息已推送到網頁`);
    }
});

app.get('/api/messages', (req, res) => {
    res.json(messageCache);
});
app.get('/api/status', (req, res) => {
    res.json({ status: 'Online', bot: client.user?.tag || 'Disconnected' });
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: client.isReady() ? 'Online' : 'Offline', 
        bot: client.user?.tag || 'Disconnected' 
    });
    });

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
    console.log(`-----------------------------------------`);
});
// 讓機器人正式連線到 Discord
client.login(TOKEN);