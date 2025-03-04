// CONSTANTS
const NETWORK_ID = 534352
const BOT_API_URL = 'http://localhost:8080'
var accounts
var web3

// ETHEREUM WALLET CONNECTION

// If the wallet is changed, reload the page
function metamaskReloadCallback() {
  window.ethereum.on('accountsChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Se cambió el account, refrescando...";
    window.location.reload()
  })
  window.ethereum.on('networkChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Se el network, refrescando...";
    window.location.reload()
  })
}

// Get the web3 instance
const getWeb3 = async () => {
  return new Promise((resolve, reject) => {
    if(document.readyState=="complete")
    {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum)
        window.location.reload()
        resolve(web3)
      } else {
        reject("must install MetaMask")
        document.getElementById("web3_message").textContent="Error: Porfavor conéctate a Metamask";
      }
    }else
    {
      window.addEventListener("load", async () => {
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum)
          resolve(web3)
        } else {
          reject("must install MetaMask")
          document.getElementById("web3_message").textContent="Error: Please install Metamask";
        }
      });
    }
  });
};

// Load the dapp, connect to the wallet and get the web3 instance
async function loadDapp() {
  metamaskReloadCallback()
  document.getElementById("web3_message").textContent="Please connect to Metamask"
  var awaitWeb3 = async function () {
    web3 = await getWeb3()
    web3.eth.net.getId((err, netId) => {
      if (netId == NETWORK_ID) {
        var awaitContract = async function () {
          document.getElementById("web3_message").textContent="You are connected to Metamask"
          web3.eth.getAccounts(function(err, _accounts){
            accounts = _accounts
            if (err != null)
            {
              console.error("An error occurred: "+err)
            } else if (accounts.length > 0)
            {
              onWalletConnectedCallback()
              document.getElementById("account_address").style.display = "block"
            } else
            {
              document.getElementById("connect_button").style.display = "block"
            }
          });
        };
        awaitContract();
      } else {
        document.getElementById("web3_message").textContent="Please connect to Scroll";
      }
    });
  };
  awaitWeb3();
}

// Connect to the wallet
async function connectWallet() {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  accounts = await web3.eth.getAccounts()
  onWalletConnectedCallback()
}

// Callback function when the wallet is connected, for this particular case, it's not used
const onWalletConnectedCallback = async () => {
}

// ERC712 FUNCTIONS

// Sign the message using the ERC712 format
async function signMessage(userId, message)
{
  const msgParams = JSON.stringify({
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
      ],
      AccessRequest: [
        { name: 'userId', type: 'uint256' },
        { name: 'message', type: 'string' }
      ],
    },
    primaryType: 'AccessRequest',
    domain: {
      name: 'Telegram Group Access',
      version: '1',
      chainId: NETWORK_ID,
    },
    message: {
      userId: userId,
      message: message,
    },
  });

  const signature = await ethereum.request({
    method: "eth_signTypedData_v4",
    params: [accounts[0], msgParams],
  });

  document.getElementById("signature").textContent="Signature: " + signature;

  await relayGreeting(userId, message, signature);
}

async function relayGreeting(userId, message, signature) {
  const requestData = {
    userId: userId,
    message: message,
    signature: signature
  };

  try {
    const response = await fetch(BOT_API_URL + '/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    alert("Message sent successfully!");
  } catch (error) {
    console.error('Error:', error);
    alert("Failed to send message: " + error.message);
  }
}

loadDapp()