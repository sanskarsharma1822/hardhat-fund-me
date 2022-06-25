const { assert, expect } = require("chai")
const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { deploymentChain } = require("../../helper-hardhat-config")

!deploymentChain.includes(network.name)
    ? describe.skip
    : describe("FundMe", () => {
          let deployer
          let fundMe
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              fundMe = await ethers.getContract("FundMe", deployer) //Everytime the contract is deployed, it is deployed by deployer
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("owner", () => {
              it("Checks getOwner function ", async function () {
                  assert.equal(await fundMe.getOwner(), deployer)
              })
          })

          describe("constructor", () => {
              it("Sets the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", () => {
              it("Fails if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Not sufficient amount"
                  )
              })

              it("Updates the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getaddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })

              it("Adds funder to array of funders", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getFunders(0)
                  assert.equal(response, deployer)
              })
          })

          describe("withdraw", () => {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })

              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const fundMeConnectedWithAttaker = await fundMe.connect(
                      attacker
                  )
                  await expect(fundMeConnectedWithAttaker.withdraw()).to.be
                      .reverted
              })

              it("Withdraws ETH from a single funder", async function () {
                  //Arrange
                  const startingContractBalance =
                      await ethers.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  //Act
                  const transaction = await fundMe.withdraw()
                  const transcationReciept = await transaction.wait(1)
                  const { gasUsed, effectiveGasPrice } = transcationReciept
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingContractBalance =
                      await ethers.provider.getBalance(fundMe.address)
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  //Assert
                  assert.equal(endingContractBalance, 0)
                  assert.equal(
                      endingDeployerBalance.add(gasCost).toString(),
                      startingContractBalance
                          .add(startingDeployerBalance)
                          .toString()
                  )
              })

              it("Withdraws ETH from multiple funders", async function () {
                  //Arrange
                  const accounts = await ethers.getSigners()
                  for (i = 1; i < 7; i++) {
                      const fundeMeConnectedToAccounts = await fundMe.connect(
                          accounts[i]
                      )
                      await fundeMeConnectedToAccounts.fund({
                          value: sendValue,
                      })
                  }

                  const startingContractBalance =
                      await ethers.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  //Act
                  const transaction = await fundMe.withdraw()
                  const transcationReciept = await transaction.wait(1)
                  const { gasUsed, effectiveGasPrice } = transcationReciept
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  //Assert
                  const endingContractBalance =
                      await ethers.provider.getBalance(fundMe.address)
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  assert(endingContractBalance, 0)
                  assert(
                      endingDeployerBalance.add(gasCost).toString(),
                      startingContractBalance
                          .add(startingDeployerBalance)
                          .toString()
                  )

                  await expect(fundMe.getFunders(0)).to.be.reverted
                  for (i = 1; i < 7; i++) {
                      assert.equal(
                          await fundMe.getaddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
          })
      })
