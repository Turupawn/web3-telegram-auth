require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { ethers } = require("ethers");
const express = require("express");
const cors = require("cors");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const requiredTokenBalance = ethers.parseUnits("1000", 18); // Required balance of 1000 SRC tokens
const tokenAddress = "0xd29687c813D741E2F938F4aC377128810E217b1b"; 
const rpcUrl = "https://rpc.ankr.com/scroll";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const abi = ["function balanceOf(address owner) view returns (uint256)"];
const contract = new ethers.Contract(tokenAddress, abi, provider);
const CHAT_ID = process.env.CHAT_ID;
const CHAIN_ID = process.env.CHAIN_ID;

const app = express();
app.use(cors());
app.use(express.json());

app.post("/verify", async (req, res) => {
    const { userId, message, signature } = req.body;
    try {
        const signerAddress = await getAuthenticationSigner(userId, message, signature);
        await bot.sendMessage(
            Number(userId), 
            `Welcome! You have successfully authenticated with wallet address ${signerAddress}\nHere, a welcome gift for you 🎁.`
        );
        res.json({ success: true, signerAddress });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(400).json({ success: false, error: error.message });
    }
});

function getAuthenticationSigner(userId, message, signature) {
    const accessRequest = {
        userId: userId,
        message: message,
    };
    const domain = {
    name: "Telegram Group Access",
    version: "1",
    chainId: CHAIN_ID,
    };
    const types = {
    AccessRequest: [
        { name: "userId", type: "uint256" },
        { name: "message", type: "string" },
    ]
    };
    return ethers.verifyTypedData(domain, types, accessRequest, signature);
}

(async () => {
    try {
        bot.botInfo = await bot.getMe();
        app.listen(8080, () => {
            console.log("\nServer is running on port 8080");
            console.log("Bot is running...");
        });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();

bot.on("message", async (msg) => {
    const text = msg.text || "";

    if (text.toLowerCase() === "authenticate") {
        const userId = msg.from.id;
        bot.sendMessage(userId, `Please visit: http://localhost:3000?userId=${userId}`);
        return;
    }
});

console.log("\nBot is running...");