const { network } = require("hardhat")
const {
    deploymentChain,
    DECIMAL,
    INITIAL_ANSWER,
} = require("../helper-hardhat-config")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    if (deploymentChain.includes(network.name)) {
        console.log("Local Network Detected. Deploying mocks ... ")
        await deploy("MockV3Aggregator", {
            from: deployer,
            args: [DECIMAL, INITIAL_ANSWER],
            log: true,
        })

        console.log("Mocks Deployed ")
        console.log("------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
