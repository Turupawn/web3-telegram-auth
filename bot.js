// We'll use the official node-telegram-bot-api library to interact with the Telegram API and ethers to verify the signature
const TelegramBot = require("node-telegram-bot-api");
const { ethers } = require("ethers");
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const CHAIN_ID = process.env.CHAIN_ID;
const WEB_DAPP_URL = process.env.WEB_DAPP_URL;

const app = express();
app.use(cors());
app.use(express.json());

//  Starts the telegram bot and the API server that recieves the signature and verifies it
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

// The /verify endpoint is used to verify the signature and send a welcome message to the user
app.post("/verify", async (req, res) => {
    const { userId, message, signature } = req.body;
    try {
        const signerAddress = await getAuthenticationSigner(userId, message, signature);
        await bot.sendMessage(
            Number(userId), 
            `Welcome! You're authenticated as ${signerAddress}.\n\nEnjoy your welcome gift! 🎁`
        );
        res.json({ success: true, signerAddress });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// getAuthenticationSigner returns the signer address by verifying the signature
function getAuthenticationSigner(userId, message, signature) {
    // accessRequest is the actual data schema of the message that we want to verify
    const accessRequest = {
        userId: userId,
        message: message,
    };
    // domain is the general information about your dapp, this is the same for all the messages
    const domain = {
        name: "Telegram Group Access",
        version: "1",
        chainId: CHAIN_ID,
    };
    // types is the data schema of the message that we want to verify
    const types = {
    AccessRequest: [
            { name: "userId", type: "uint256" },
            { name: "message", type: "string" },
        ]
    };
    // verifyTypedData verifies the signature in the erc712 style and return the signer address by ecrecovering
    // We don't need to do worry about those details, ethers does it for us
    return ethers.verifyTypedData(domain, types, accessRequest, signature);
}

// This is the main function that runs when the bot receives a message
bot.on("message", async (msg) => {
    const text = msg.text || "";
    // It checks if the message is "authenticate" and if so, it sends a message to the user to visit the website
    if (text.toLowerCase() === "authenticate") {
        // userId is the user's id in telegram
        const userId = msg.from.id;
        // We send the user to the web dapp to authenticate
        bot.sendMessage(WEB_DAPP_URL, userId, `Please visit: ${WEB_DAPP_URL}?userId=${userId}`);
        return;
    }
});

console.log("\nBot is running...");