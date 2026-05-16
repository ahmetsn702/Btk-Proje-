import { ethers, upgrades } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider!.getBalance(deployer.address)).toString());

  // ─── 1. CategoryPoints1155 (UUPS Proxy) ──────────────────────────────────
  const CategoryPoints1155Factory = await ethers.getContractFactory("CategoryPoints1155", deployer);
  const cp = await upgrades.deployProxy(CategoryPoints1155Factory, [
    "https://api.example.com/metadata/", // baseURI
    deployer.address,                    // admin
  ], { kind: "uups" });
  await cp.waitForDeployment();
  const cpAddress = await cp.getAddress();
  console.log("CategoryPoints1155 deployed at:", cpAddress);

  // ─── 2. ExtendedPointToken (UUPS Proxy) ─────────────────────────────────
  const ExtendedPointTokenFactory = await ethers.getContractFactory("ExtendedPointToken", deployer);
  const xp = await upgrades.deployProxy(ExtendedPointTokenFactory, [
    deployer.address, // admin
  ], { kind: "uups" });
  await xp.waitForDeployment();
  const xpAddress = await xp.getAddress();
  console.log("ExtendedPointToken deployed at:", xpAddress);

  // ─── 3. Genesis Mint (10,000,000 XP to Exchange placeholder) ─────────────
  // Note: In production, replace deployer.address with actual Exchange address
  // after Exchange (Faz 3) is deployed. For now, we use deployer as placeholder.
  const genesisRecipient = deployer.address; // TODO: replace with Exchange address
  const tx = await xp.genesisMint(genesisRecipient);
  await tx.wait();
  console.log("Genesis mint complete: 10,000,000 XP to", genesisRecipient);

  // ─── 4. Role Setup ──────────────────────────────────────────────────────
  // Grant MINTER_ROLE and BURNER_ROLE on CP to deployer (placeholder for TaskRewardManager & Exchange)
  await cp.grantRole(await cp.MINTER_ROLE(), deployer.address); // TODO: TaskRewardManager
  await cp.grantRole(await cp.BURNER_ROLE(), deployer.address);  // TODO: Exchange

  // Grant MINTER_ROLE and BURNER_ROLE on XP to deployer (placeholder for Exchange)
  await xp.grantRole(await xp.MINTER_ROLE(), deployer.address); // TODO: Exchange
  await xp.grantRole(await xp.BURNER_ROLE(), deployer.address);  // TODO: Exchange

  console.log("Roles granted to deployer (update to Exchange/TRM after Faz 3/5)");

  // ─── 5. Set Exchange & TaskRewardManager on CP (placeholder) ─────────────
  await cp.setExchange(deployer.address);            // TODO: Exchange address
  await cp.setTaskRewardManager(deployer.address); // TODO: TaskRewardManager address
  console.log("Exchange & TaskRewardManager set on CP (placeholder — update later)");

  // ─── 6. Save deployment artifacts ────────────────────────────────────────
  const deploymentsDir = join(__dirname, "..", "deployments");
  mkdirSync(deploymentsDir, { recursive: true });

  const deploymentData = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      CategoryPoints1155: {
        proxy: cpAddress,
        implementation: await upgrades.erc1967.getImplementationAddress(cpAddress),
      },
      ExtendedPointToken: {
        proxy: xpAddress,
        implementation: await upgrades.erc1967.getImplementationAddress(xpAddress),
      },
    },
  };

  writeFileSync(
    join(deploymentsDir, `deployment-${deploymentData.network}.json`),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("\nDeployment artifact saved to deployments/");
  console.log(JSON.stringify(deploymentData, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
