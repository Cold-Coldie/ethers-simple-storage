const ethers = require("ethers");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const getABI = () => {
    try {
        const dir = path.resolve(__dirname, "./SimpleStorage.json");
        const file = fs.readFileSync(dir, "utf8");
        const json = JSON.parse(file);

        // Check if json is an array; assume it is the ABI if no other properties
        const abi = Array.isArray(json) ? json : json.abi;
        // console.log(`abi`, abi);

        return abi;
    } catch (e) {
        console.log(`e`, e);
    }
};

const getBytecode = () => {
    try {
        const bytecodePath = path.join(__dirname, "SimpleStorage.bin");
        const bytecode = fs.readFileSync(bytecodePath, "utf8");
        // console.log(`bytecode`, bytecode);

        return bytecode;
    } catch (e) {
        console.log(`e`, e);
    }
};

async function main() {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const encryptedJson = fs.readFileSync("./encryptedKey.json", "utf8");
        let wallet = await ethers.Wallet.fromEncryptedJson(
            encryptedJson,
            process.env.PRIVATE_KEY_PASSWORD,
        );
        wallet = wallet.connect(provider);

        const contractFactory = new ethers.ContractFactory(
            getABI(),
            getBytecode(),
            wallet,
        );

        const overrides = {
            gasPrice: (await provider.getFeeData()).gasPrice, // Can set this >= to the number read from Ganache window
            gasLimit: 6721975, // Use the same gasLimit as read from Ganache window (or a bit higher if still having issue)
        };

        console.log("Deploying, please wait...");

        const contract = await contractFactory.deploy(overrides);

        await contract.deploymentTransaction().wait(1);

        console.log(`Contract Address: ${await contract.getAddress()}`);

        // console.log("Here is the transaction receipt: ");
        // console.log({ transactionReceipt });

        // console.log("Here is the deployment transaction: ");
        // console.log({ deploymentTransaction: contract.deploymentTransaction() });

        const currentFavoriteNumber = await contract.retrieve();
        console.log(
            `Current favourite number: ${currentFavoriteNumber.toString()}`,
        );

        const transactionResponse = await contract.store("7");
        const transactionReceipt = await transactionResponse.wait(1);
        const updatedFavouriteNumber = await contract.retrieve();
        console.log(`Updated favourite number is: ${updatedFavouriteNumber}`);
    } catch (error) {
        console.error("Error waiting for transaction confirmation:", error);
    }
}

const rawMain = async () => {
    try {
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
        const wallet = new ethers.Wallet(
            "0x6e9695232f0214f1e1ece49ca69a4409b87d2dd56a44f60bb7e7bf9284f7f619",
            provider,
        );

        const tx = {
            nonce: await wallet.getNonce(),
            gasPrice: (await provider.getFeeData()).gasPrice,
            gasLimit: 6721975,
            to: null,
            value: 0,
            data: `0x${getBytecode()}`,
            chainId: wallet.id,
        };

        console.log("Deploying, please wait...");

        const sentTxResponse = await wallet.sendTransaction(tx);
        const receipt = await sentTxResponse.wait(1); // Wait for 1 confirmation
        console.log("Transaction mined: ", receipt);
    } catch (error) {
        console.error("Error waiting for transaction confirmation:", error);
    }
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
