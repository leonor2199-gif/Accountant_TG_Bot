const fs = require("fs");
const moment = require("moment");

function nowTime() {
    return moment().format("HH:mm:ss");
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