import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { CategoryPoints1155 } from "../typechain-types";

describe("CategoryPoints1155", () => {
  let cp: CategoryPoints1155;
  let admin: HardhatEthersSigner;
  let minter: HardhatEthersSigner;
  let burner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let exchange: HardhatEthersSigner;
  let taskRewardManager: HardhatEthersSigner;

  const CATEGORY_GIYIM = 1n;
  const CATEGORY_ELEKTRONIK = 2n;
  const CATEGORY_KITAP = 3n;

  beforeEach(async () => {
    [admin, minter, burner, user, exchange, taskRewardManager] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("CategoryPoints1155", admin);
    cp = (await upgrades.deployProxy(factory, ["https://api.example.com/metadata/", admin.address], {
      kind: "uups",
    })) as unknown as CategoryPoints1155;
    await cp.waitForDeployment();

    // Grant roles
    await cp.connect(admin).grantRole(await cp.MINTER_ROLE(), minter.address);
    await cp.connect(admin).grantRole(await cp.BURNER_ROLE(), burner.address);

    // Set Exchange and TaskRewardManager addresses
    await cp.connect(admin).setExchange(exchange.address);
    await cp.connect(admin).setTaskRewardManager(taskRewardManager.address);
  });

  describe("Deployment & Roles", () => {
    it("should assign DEFAULT_ADMIN_ROLE to deployer", async () => {
      expect(await cp.hasRole(await cp.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    });

    it("should allow admin to grant MINTER_ROLE", async () => {
      expect(await cp.hasRole(await cp.MINTER_ROLE(), minter.address)).to.be.true;
    });

    it("should allow admin to set Exchange and TaskRewardManager", async () => {
      expect(await cp.exchange()).to.equal(exchange.address);
      expect(await cp.taskRewardManager()).to.equal(taskRewardManager.address);
    });
  });

  describe("Minting", () => {
    it("should allow MINTER_ROLE to mint CP", async () => {
      await cp.connect(minter).mint(user.address, CATEGORY_GIYIM, 100n);
      expect(await cp.balanceOf(user.address, CATEGORY_GIYIM)).to.equal(100n);
    });

    it("should revert if non-minter tries to mint", async () => {
      await expect(cp.connect(user).mint(user.address, CATEGORY_GIYIM, 100n))
        .to.be.revertedWithCustomError(cp, "AccessControlUnauthorizedAccount");
    });

    it("should allow batch mint across categories", async () => {
      const ids = [CATEGORY_GIYIM, CATEGORY_ELEKTRONIK, CATEGORY_KITAP];
      const amounts = [100n, 200n, 300n];
      await cp.connect(minter).batchMint(user.address, ids, amounts);

      expect(await cp.balanceOf(user.address, CATEGORY_GIYIM)).to.equal(100n);
      expect(await cp.balanceOf(user.address, CATEGORY_ELEKTRONIK)).to.equal(200n);
      expect(await cp.balanceOf(user.address, CATEGORY_KITAP)).to.equal(300n);
    });

    it("should revert batchMint with mismatched lengths", async () => {
      await expect(cp.connect(minter).batchMint(user.address, [CATEGORY_GIYIM], [100n, 200n]))
        .to.be.revertedWith("CP: length mismatch");
    });
  });

  describe("Burning", () => {
    beforeEach(async () => {
      await cp.connect(minter).mint(user.address, CATEGORY_GIYIM, 100n);
    });

    it("should allow BURNER_ROLE to burn CP", async () => {
      await cp.connect(burner).burn(user.address, CATEGORY_GIYIM, 50n);
      expect(await cp.balanceOf(user.address, CATEGORY_GIYIM)).to.equal(50n);
    });

    it("should revert if non-burner tries to burn", async () => {
      await expect(cp.connect(user).burn(user.address, CATEGORY_GIYIM, 50n))
        .to.be.revertedWithCustomError(cp, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Transfer Lock (P2P Disabled)", () => {
    beforeEach(async () => {
      await cp.connect(minter).mint(user.address, CATEGORY_GIYIM, 100n);
    });

    it("should REVERT user-to-user transfer", async () => {
      await expect(
        cp.connect(user).safeTransferFrom(user.address, minter.address, CATEGORY_GIYIM, 10n, "0x")
      ).to.be.revertedWith("CP: P2P transfer disabled");
    });

    it("should REVERT user-to-exchange transfer", async () => {
      await expect(
        cp.connect(user).safeTransferFrom(user.address, exchange.address, CATEGORY_GIYIM, 10n, "0x")
      ).to.be.revertedWith("CP: P2P transfer disabled");
    });

    it("should ALLOW internal routing: exchange -> taskRewardManager", async () => {
      // First, mint to exchange so it has balance to transfer
      await cp.connect(minter).mint(exchange.address, CATEGORY_GIYIM, 50n);
      await cp.connect(exchange).safeTransferFrom(exchange.address, taskRewardManager.address, CATEGORY_GIYIM, 20n, "0x");
      expect(await cp.balanceOf(taskRewardManager.address, CATEGORY_GIYIM)).to.equal(20n);
    });

    it("should ALLOW internal routing: taskRewardManager -> exchange", async () => {
      await cp.connect(minter).mint(taskRewardManager.address, CATEGORY_GIYIM, 50n);
      await cp.connect(taskRewardManager).safeTransferFrom(
        taskRewardManager.address,
        exchange.address,
        CATEGORY_GIYIM,
        20n,
        "0x"
      );
      expect(await cp.balanceOf(exchange.address, CATEGORY_GIYIM)).to.equal(20n);
    });
  });

  describe("Pause", () => {
    it("should allow PAUSER_ROLE to pause and unpause", async () => {
      await cp.connect(admin).pause();
      expect(await cp.paused()).to.be.true;

      await cp.connect(admin).unpause();
      expect(await cp.paused()).to.be.false;
    });

    it("should revert mint while paused", async () => {
      await cp.connect(admin).pause();
      await expect(cp.connect(minter).mint(user.address, CATEGORY_GIYIM, 100n))
        .to.be.revertedWithCustomError(cp, "EnforcedPause");
    });
  });
});
