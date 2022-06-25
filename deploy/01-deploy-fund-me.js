const { network } = require("hardhat")
const { networkConfig, deploymentChain } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config()

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let priceFeedAddress

    if (deploymentChain.includes(network.name)) {
        const mockAggregator = await get("MockV3Aggregator")
        priceFeedAddress = mockAggregator.address
    } else {
        priceFeedAddress = networkConfig[chainId]["ethUSDPriceFeed"]
    }
    console.log("Deploying Fund Me ...")
    const args = [priceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    console.log("Fund Me Deployed")

    if (
        !deploymentChain.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        //verify
        console.log("Verifying ...")
        await verify(fundMe.address, args)
    }
    console.log("------------------------------------------------")
}

module.exports.tags = ["all", "fundMe"]
