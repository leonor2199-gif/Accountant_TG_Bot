// ================= KEEP ALIVE SERVER =================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 Bot is running!');
});

app.get('/ping', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Keep-alive server running on port ${PORT}`);
});
// =====================================================

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const { loadData, saveData, nowTime } = require("./utils");

const bot = new TelegramBot(process.env.BOT_TOKEN, { 
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    },
    request: {
        timeout: 60000
    }
});

let data = loadData();

// ================= MULTIPLE OWNERS CONFIGURATION =================
const OWNER_IDS = process.env.OWNER_IDS 
    ? process.env.OWNER_IDS.split(',').map(id => id.trim())
    : [process.env.OWNER_ID];

function isOwner(userId) {
    return OWNER_IDS.includes(String(userId));
}

console.log("机器人运行中...");
console.log("管理员IDs:", OWNER_IDS);
console.log("模式: 仅接受存款 (不接受提款)");

/* ================= 主菜单键盘 ================= */
function getMainMenu() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: "📊 查看报表" }, { text: "📈 查看状态" }],
                [{ text: "✅ 开始机器人" }, { text: "🛑 停止机器人" }],
                [{ text: "⚙️ 设置费率" }, { text: "💱 设置汇率" }],
                [{ text: "💰 更新已下发" }, { text: "❓ 帮助" }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

/* ================= 管理员菜单 ================= */
function getAdminMenu() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: "📊 查看报表" }, { text: "📈 查看状态" }],
                [{ text: "✅ 开始机器人" }, { text: "🛑 停止机器人" }],
                [{ text: "⚙️ 设置费率" }, { text: "💱 设置汇率" }],
                [{ text: "💰 更新已下发" }, { text: "🗑️ 清空数据" }],
                [{ text: "👥 管理员列表" }, { text: "❓ 帮助" }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

/* ================= 内联按钮 ================= */
function getInlineButtons() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 查看报表", callback_data: "report" }],
                [{ text: "📈 查看状态", callback_data: "status" }],
                [
                    { text: "✅ 开始", callback_data: "start" },
                    { text: "🛑 停止", callback_data: "stop" }
                ],
                [
                    { text: "⚙️ 设置费率", callback_data: "set_fee" },
                    { text: "💱 设置汇率", callback_data: "set_rate" }
                ],
                [{ text: "💰 更新已下发", callback_data: "set_paid" }],
                [{ text: "👥 管理员列表", callback_data: "owners" }]
            ]
        }
    };
}

/* ================= 开始命令 ================= */
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!isOwner(msg.from.id)) {
        return bot.sendMessage(chatId, "❌ 您没有权限使用此机器人");
    }

    data.running = true;
    data.transactions = [];
    saveData(data);

    const welcomeMsg = `✅ *机器人已启动成功！*

📌 使用说明：
• 发送数字记录存款
• 例如: 100 或 +100
• 只接受存款，不接受提款

👥 当前管理员：${OWNER_IDS.length} 位

💡 您也可以使用下方按钮快速操作`;

    bot.sendMessage(chatId, welcomeMsg, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 停止命令 ================= */
bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!isOwner(msg.from.id)) {
        return bot.sendMessage(chatId, "❌ 您没有权限使用此机器人");
    }

    data.running = false;
    saveData(data);

    bot.sendMessage(chatId, `🛑 *机器人已停止*\n\n最终报表：\n${generateReport()}`, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 设置费率 ================= */
bot.onText(/\/fee (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return;

    data.feeRate = Number(match[1]);
    saveData(data);

    bot.sendMessage(chatId, `💰 *费率已设置：${match[1]}%*`, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 设置汇率 ================= */
bot.onText(/\/rate ([0-9.]+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return;

    data.exchangeRate = Number(match[1]);
    saveData(data);

    bot.sendMessage(chatId, `💱 *汇率已设置：${match[1]}*`, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 更新已下发 ================= */
bot.onText(/\/paid (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return;

    data.paid = Number(match[1]);
    saveData(data);

    bot.sendMessage(chatId, `💰 *已下发金额更新为：${match[1]} U*`, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 清空数据 ================= */
bot.onText(/\/clear/, (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return;

    data.transactions = [];
    data.paid = 0;
    saveData(data);

    bot.sendMessage(chatId, "🗑️ *所有数据已清空！*", { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 查看管理员列表 ================= */
bot.onText(/\/owners/, (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return;

    let ownerList = "👥 *管理员列表*\n\n";
    OWNER_IDS.forEach((id, index) => {
        const isCurrent = String(msg.from.id) === id ? " 👈 (您)" : "";
        ownerList += `${index + 1}. \`${id}\`${isCurrent}\n`;
    });
    ownerList += `\n共 ${OWNER_IDS.length} 位管理员`;

    bot.sendMessage(chatId, ownerList, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 查看报表 ================= */
bot.onText(/\/report/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!isOwner(msg.from.id)) {
        return bot.sendMessage(chatId, "❌ 您没有权限使用此机器人");
    }
    
    if (!data.running) {
        return bot.sendMessage(chatId, "⛔ 机器人已停止。请使用 /start 启动。", {
            ...getAdminMenu()
        });
    }
    
    bot.sendMessage(chatId, generateReport(), { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 查看状态 ================= */
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return;
    
    const totalDeposits = data.transactions.filter(t => t.type === "deposit").length;
    const totalAmount = data.transactions.reduce((sum, t) => sum + t.amount, 0);
    
    const statusMsg = `📊 *机器人状态*

🟢 运行状态：${data.running ? "✅ 运行中" : "❌ 已停止"}
📝 交易总数：${data.transactions.length}
📈 存款笔数：${totalDeposits}
💰 总存款额：${totalAmount}
💳 费率：${data.feeRate}%
💱 汇率：${data.exchangeRate}
💵 已下发：${data.paid} U
👥 管理员数：${OWNER_IDS.length}

📌 快捷命令：
/start - 启动机器人
/stop - 停止机器人
/report - 查看报表
/status - 查看状态
/fee [数字] - 设置费率
/rate [数字] - 设置汇率
/paid [数字] - 更新已下发
/clear - 清空所有数据
/owners - 查看管理员列表
/help - 显示帮助`;

    bot.sendMessage(chatId, statusMsg, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 帮助命令 ================= */
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return;
    
    const helpMsg = `🤖 *机器人使用帮助*

📌 *管理员命令：*
/start - 启动机器人并重置数据
/stop - 停止机器人并显示最终报表
/report - 显示交易报表
/status - 显示机器人状态
/fee [数字] - 设置费率（如：/fee 5）
/rate [数字] - 设置汇率（如：/rate 18.5）
/paid [数字] - 更新已下发金额
/clear - 清空所有交易数据
/owners - 查看管理员列表
/help - 显示此帮助

📝 *存款录入：*
发送数字记录存款：
100 - 存款100
+100 - 存款100

⚠️ *重要：*
• 只接受存款，不接受提款
• 负数和提款请求将被忽略

💡 *提示：*
• 所有数据自动保存
• 报表显示最近5笔存款
• 费用计算在总存款上

👥 *管理员：*
${OWNER_IDS.length} 位管理员已配置

🔐 *安全提醒：*
只有管理员可以使用此机器人`;

    bot.sendMessage(chatId, helpMsg, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 消息监听器 ================= */
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    
    if (!msg.text) return;
    if (msg.text.startsWith("/")) return;
    
    // 检查是否是管理员
    if (!isOwner(msg.from.id)) {
        return bot.sendMessage(chatId, "❌ 您没有权限使用此机器人");
    }
    
    // 处理按钮文本命令
    switch(msg.text) {
        case "📊 查看报表":
            if (!data.running) {
                return bot.sendMessage(chatId, "⛔ 机器人已停止。请点击「✅ 开始机器人」启动。", getAdminMenu());
            }
            return bot.sendMessage(chatId, generateReport(), { parse_mode: "Markdown", ...getAdminMenu() });
        case "📈 查看状态":
            return handleStatus(chatId);
        case "✅ 开始机器人":
            return handleStart(chatId);
        case "🛑 停止机器人":
            return handleStop(chatId);
        case "⚙️ 设置费率":
            return bot.sendMessage(chatId, "💡 请发送：/fee [数字]\n例如：/fee 5", getAdminMenu());
        case "💱 设置汇率":
            return bot.sendMessage(chatId, "💡 请发送：/rate [数字]\n例如：/rate 18.5", getAdminMenu());
        case "💰 更新已下发":
            return bot.sendMessage(chatId, "💡 请发送：/paid [数字]\n例如：/paid 100", getAdminMenu());
        case "🗑️ 清空数据":
            return handleClear(chatId);
        case "👥 管理员列表":
            return handleOwners(chatId);
        case "❓ 帮助":
            return bot.sendMessage(chatId, "🤖 *机器人使用帮助*\n\n📌 发送数字记录存款：\n100 或 +100\n\n❌ 不接受提款\n\n更多命令请使用 /help", { parse_mode: "Markdown", ...getAdminMenu() });
    }
    
    // 处理交易录入
    if (!data.running) {
        return bot.sendMessage(chatId, "⛔ 机器人已停止。请点击「✅ 开始机器人」启动。", getAdminMenu());
    }

    // 提取数字（支持带+号或不带+号）
    const match = msg.text.match(/(\d+)/);
    if (!match) {
        return bot.sendMessage(chatId, "❌ 请发送有效数字\n示例：100 或 +100", getAdminMenu());
    }

    const amount = Number(match[1]);

    if (amount === 0) {
        return bot.sendMessage(chatId, "❌ 金额不能为0", getAdminMenu());
    }

    // 检查是否是提款（包含负号）
    if (msg.text.includes('-')) {
        return bot.sendMessage(chatId, "❌ 本机器人只接受存款，不接受提款", getAdminMenu());
    }

    // 只记录存款
    data.transactions.push({
        type: "deposit",
        amount: amount,
        time: nowTime()
    });

    saveData(data);

    console.log("✅ 存款已保存:", amount);

    // 发送确认信息
    bot.sendMessage(chatId, `✅ *存款已记录！*\n💰 金额：${amount}\n\n${generateReport()}`, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
});

/* ================= 回调查询处理 ================= */
bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;
    
    if (!isOwner(callbackQuery.from.id)) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ 您没有权限" });
    }
    
    switch(action) {
        case "report":
            if (!data.running) {
                bot.sendMessage(chatId, "⛔ 机器人已停止。请先启动机器人。", getAdminMenu());
            } else {
                bot.sendMessage(chatId, generateReport(), { parse_mode: "Markdown", ...getAdminMenu() });
            }
            break;
        case "status":
            handleStatus(chatId);
            break;
        case "start":
            handleStart(chatId);
            break;
        case "stop":
            handleStop(chatId);
            break;
        case "set_fee":
            bot.sendMessage(chatId, "💡 请发送：/fee [数字]\n例如：/fee 5", getAdminMenu());
            break;
        case "set_rate":
            bot.sendMessage(chatId, "💡 请发送：/rate [数字]\n例如：/rate 18.5", getAdminMenu());
            break;
        case "set_paid":
            bot.sendMessage(chatId, "💡 请发送：/paid [数字]\n例如：/paid 100", getAdminMenu());
            break;
        case "owners":
            handleOwners(chatId);
            break;
    }
    
    bot.answerCallbackQuery(callbackQuery.id);
});

/* ================= 辅助函数 ================= */
function handleStart(chatId) {
    data.running = true;
    data.transactions = [];
    saveData(data);
    bot.sendMessage(chatId, "✅ *机器人已启动成功！*\n\n可以开始记录存款了", { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
}

function handleStop(chatId) {
    data.running = false;
    saveData(data);
    bot.sendMessage(chatId, `🛑 *机器人已停止*\n\n最终报表：\n${generateReport()}`, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
}

function handleStatus(chatId) {
    const totalDeposits = data.transactions.filter(t => t.type === "deposit").length;
    const totalAmount = data.transactions.reduce((sum, t) => sum + t.amount, 0);
    
    const statusMsg = `📊 *机器人状态*

🟢 运行状态：${data.running ? "✅ 运行中" : "❌ 已停止"}
📝 交易总数：${data.transactions.length}
📈 存款笔数：${totalDeposits}
💰 总存款额：${totalAmount}
💳 费率：${data.feeRate}%
💱 汇率：${data.exchangeRate}
💵 已下发：${data.paid} U
👥 管理员数：${OWNER_IDS.length}`;

    bot.sendMessage(chatId, statusMsg, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
}

function handleClear(chatId) {
    data.transactions = [];
    data.paid = 0;
    saveData(data);
    bot.sendMessage(chatId, "🗑️ *所有数据已清空！*", { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
}

function handleOwners(chatId) {
    let ownerList = "👥 *管理员列表*\n\n";
    OWNER_IDS.forEach((id, index) => {
        ownerList += `${index + 1}. \`${id}\`\n`;
    });
    ownerList += `\n共 ${OWNER_IDS.length} 位管理员`;

    bot.sendMessage(chatId, ownerList, { 
        parse_mode: "Markdown",
        ...getAdminMenu()
    });
}

/* ================= 报表生成器 ================= */
function generateReport() {
    // 获取所有存款交易
    const deposits = data.transactions.filter(t => t.type === "deposit");
    
    // 计算总存款
    const totalDeposits = deposits.reduce((a, b) => a + b.amount, 0);
    
    // 只显示最近5笔存款
    const displayDeposits = deposits.slice(-5);

    // 计算费用
    const afterFee = totalDeposits * (1 - data.feeRate / 100);

    const usd = afterFee / data.exchangeRate;

    const lines = displayDeposits
        .map(t => `${t.time}     ${t.amount}`)
        .join("\n");

    // 计算待下发金额
    const pendingAmount = usd - data.paid;

    return `📊 *交易报表*

入款（${deposits.length}）笔
${lines || "暂无存款记录"}
----------------------------
入款费率：${data.feeRate}%
入款汇率：${data.exchangeRate}
入款总数：${totalDeposits}
入款总计：${afterFee.toFixed(2)} | ${usd.toFixed(2)} USD
-----------------------------
应下发：${usd.toFixed(2)} U
已下发：${data.paid} U
未下发：${pendingAmount.toFixed(2)} U`;
}

/* ================= 错误处理 ================= */
bot.on("polling_error", (error) => {
    console.log("轮询错误:", error.message);
    
    if (error.code === 'EFATAL' || error.code === 'ECONNRESET') {
        console.log("检测到连接错误。尝试重新启动轮询...");
        setTimeout(() => {
            try {
                bot.stopPolling();
                setTimeout(() => {
                    bot.startPolling();
                    console.log("轮询已成功重启！");
                }, 2000);
            } catch (e) {
                console.log("重启轮询时出错:", e.message);
            }
        }, 5000);
    }
});

process.on('uncaughtException', (error) => {
    console.log('未捕获的异常:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('未处理的拒绝:', reason);
});

console.log("机器人已启动，增强错误处理已启用！");
console.log("当前管理员:", OWNER_IDS);
console.log("模式: 仅存款");
console.log(`🌐 Keep-alive server running on port ${PORT}`);
