const fs = require("fs");

function nowTime() {
    // Get current time in Mexico timezone (UTC-6) without moment-timezone
    const now = new Date();
    const mexicoTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    
    const hours = String(mexicoTime.getHours()).padStart(2, '0');
    const minutes = String(mexicoTime.getMinutes()).padStart(2, '0');
    const seconds = String(mexicoTime.getSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

function loadData() {
    if (!fs.existsSync("./data.json")) {
        const defaultData = {
            running: false,
            feeRate: 4,
            exchangeRate: 18.5,
            transactions: [],
            paid: 0
        };
        fs.writeFileSync("./data.json", JSON.stringify(defaultData, null, 2));
        return defaultData;
    }

    return JSON.parse(fs.readFileSync("./data.json", "utf8"));
}

function saveData(data) {
    fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));
}

module.exports = {
    nowTime,
    loadData,
    saveData
};
