// Import Taquito and Beacon Wallet libraries
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';

// Initialize TezosToolkit with the RPC URL of the desired Tezos network
const Tezos = new TezosToolkit('https://mainnet.api.tez.ie');

// Initialize BeaconWallet with the name of your application and preferred network
const wallet = new BeaconWallet({
  name: 'DA Tezos Test App',
  preferredNetwork: 'mainnet',
});

const nftContractAddress = 'KT1CGsD6Rn3zBL6D829pizBTGVMdzNqHNUzb'; // The contract address of the NFT
const nftTokenId = 109; // The token ID of the NFT you're checking for

// Setting the wallet provider for Taquito
Tezos.setWalletProvider(wallet);

// Check Wallet Status & Update UI
async function checkWalletStatusAndUpdateUI() {
  const activeAccount = await wallet.client.getActiveAccount();
  if (activeAccount) {
    console.log('Wallet is already connected:', activeAccount.address);
    updateUI('Re-Sync Wallet', '');
    checkNFTOwnership(activeAccount.address); // Directly check NFT ownership
  } else {
    updateUI('Sync Wallet', '');
  }
}

// Update the UI button message
function updateUI(buttonText, message = '') {
  const button = document.getElementById('connectWalletButton');
  button.textContent = buttonText;
}

// Sync Wallet for the first time or Re-Sync Wallet
async function syncOrResyncWallet() {
  try {
    await wallet.requestPermissions({ network: { type: 'mainnet' } });
    const address = await wallet.getPKH(); // This ensures 'address' is defined
    console.log('Wallet connected with address:', address);
    checkNFTOwnership(address); // Correctly pass 'address' as 'walletAddress'
  } catch (error) {
    console.error('Error connecting wallet:', error);
  }
}

// Function to show ownership verified UI
function showOwnershipVerified() {
  document.getElementById('ownershipVerified').style.display = 'block';
  document.getElementById('noOwnership').style.display = 'none';
}

// Function to show no ownership UI
function showNoOwnership() {
  document.getElementById('ownershipVerified').style.display = 'none';
  document.getElementById('noOwnership').style.display = 'block';
  document.getElementById('objktLink').href = `https://objkt.com/asset/${nftContractAddress}/${nftTokenId}`;
}

// Function to check the NFT ownership more accurately
async function checkNFTOwnership(walletAddress) {
  // Fetching all tokens with non-zero balance for the account
  const url = `https://api.tzkt.io/v1/tokens/balances?account=${walletAddress}&balance.ne=0`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

    const data = await response.json();

    // Checking if the fetched tokens contain the specific NFT by contract address and token ID
    const ownsSpecificNFT = data.some(entry => 
      entry.token.contract.address === nftContractAddress && entry.token.tokenId === String(nftTokenId) && parseInt(entry.balance) > 0
    );

    if (ownsSpecificNFT) {
      console.log("User currently owns the specific NFT.");
      showOwnershipVerified(); // Show ownership verified UI
      generateToken();
      fetchSecureContent(walletAddress);
    } else {
      console.log("User does not currently own the specific NFT.");
      showNoOwnership(); // Show no ownership UI
    }
  } catch (error) {
    console.error("Failed to check specific NFT ownership:", error);
    // It might be prudent to handle errors in a user-friendly way here
  }
}

// Example token generation after successful NFT ownership verification
function generateToken(userAddress) {
    const tokenPayload = {
        user: userAddress,
        timestamp: new Date().getTime()
    };
    const token = btoa(JSON.stringify(tokenPayload));
    return token;
}

// Example of including the token in the fetch request to Cloudflare Worker and handling the secure content
async function fetchSecureContent(walletAddress) {
    const token = generateToken(walletAddress);
    const workerUrl = 'https://luckystarclaims.moon-248.workers.dev'; // the Cloudflare Worker URL

    try {
        const response = await fetch(workerUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        // Create a blob from the response
        const blob = await response.blob();

        // Generate a URL for the blob
        const url = window.URL.createObjectURL(blob);

        // Update the UI with the download link
        updateDownloadLink(url);

    } catch (error) {
        console.error('Failed to fetch secure content:', error);
        // Optionally, update the UI to show an error message
    }
}

function updateDownloadLink(downloadUrl) {
    const downloadLink = document.getElementById('downloadLink');
    if (downloadLink) {
        downloadLink.href = downloadUrl;
        downloadLink.download = "secure-image.png"; // The name of the file to be downloaded
        downloadLink.textContent = 'Download Secure Image';
        downloadLink.style.display = 'block'; // Make sure the link is visible
    }
}

// Bind the connectWallet function to the button
document.getElementById('connectWalletButton').addEventListener('click', syncOrResyncWallet);

// Check the wallet's status on page load
checkWalletStatusAndUpdateUI();
