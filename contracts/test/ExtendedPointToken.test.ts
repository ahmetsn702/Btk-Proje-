import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ExtendedPointToken } from '../typechain-types';

describe('ExtendedPointToken', () => {
  let xp: ExtendedPointToken;
  let admin: HardhatEthersSigner;
  let exchange: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  const GENESIS_SUPPLY = 10_000_000n * 10n ** 18n;

  beforeEach(async () => {
    [admin, exchange, user] = await ethers.getSigners();

    const factory = await ethers.getContractFactory('ExtendedPointToken', admin);
    xp = (await upgrades.deployProxy(factory, [admin.address], {
      kind: 'uups',
    })) as unknown as ExtendedPointToken;
    await xp.waitForDeployment();
  });

  describe('Deployment & Genesis', () => {
    it('should have correct name and symbol', async () => {
      expect(await xp.name()).to.equal('Extended Point');
      expect(await xp.symbol()).to.equal('XP');
    });

    it('should assign DEFAULT_ADMIN_ROLE to deployer', async () => {
      void expect(await xp.hasRole(await xp.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    });

    it('should have genesisMinted == false initially', async () => {
      void expect(await xp.genesisMinted()).to.be.false;
    });

    it('should mint 10,000,000 XP on genesisMint', async () => {
      await xp.connect(admin).genesisMint(exchange.address);
      expect(await xp.balanceOf(exchange.address)).to.equal(GENESIS_SUPPLY);
      expect(await xp.totalSupply()).to.equal(GENESIS_SUPPLY);
      void expect(await xp.genesisMinted()).to.be.true;
    });

    it('should revert genesisMint if already minted', async () => {
      await xp.connect(admin).genesisMint(exchange.address);
      await expect(xp.connect(admin).genesisMint(exchange.address)).to.be.revertedWith(
        'XP: genesis already minted',
      );
    });

    it('should revert genesisMint to zero address', async () => {
      await expect(xp.connect(admin).genesisMint(ethers.ZeroAddress)).to.be.revertedWith(
        'XP: zero address',
      );
    });

    it('should revert genesisMint if called by non-admin', async () => {
      await expect(xp.connect(user).genesisMint(exchange.address)).to.be.revertedWithCustomError(
        xp,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('Minting & Burning', () => {
    beforeEach(async () => {
      await xp.connect(admin).genesisMint(exchange.address);
      await xp.connect(admin).grantRole(await xp.MINTER_ROLE(), exchange.address);
      await xp.connect(admin).grantRole(await xp.BURNER_ROLE(), exchange.address);
    });

    it('should allow MINTER_ROLE to mint additional XP', async () => {
      await xp.connect(exchange).mint(user.address, 1000n);
      expect(await xp.balanceOf(user.address)).to.equal(1000n);
    });

    it('should revert mint without MINTER_ROLE', async () => {
      await expect(xp.connect(user).mint(user.address, 1000n)).to.be.revertedWithCustomError(
        xp,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should allow BURNER_ROLE to burn XP', async () => {
      // First mint to user via exchange
      await xp.connect(exchange).mint(user.address, 5000n);
      await xp.connect(exchange).burn(user.address, 2000n);
      expect(await xp.balanceOf(user.address)).to.equal(3000n);
    });

    it('should revert burn without BURNER_ROLE', async () => {
      await xp.connect(exchange).mint(user.address, 5000n);
      await expect(xp.connect(user).burn(user.address, 2000n)).to.be.revertedWithCustomError(
        xp,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('Transfers', () => {
    beforeEach(async () => {
      await xp.connect(admin).genesisMint(exchange.address);
    });

    it('should allow free XP transfers between users', async () => {
      await xp.connect(exchange).transfer(user.address, 10000n);
      expect(await xp.balanceOf(user.address)).to.equal(10000n);
    });

    it('should maintain total supply consistency after transfers', async () => {
      await xp.connect(exchange).transfer(user.address, 50000n);
      expect(await xp.totalSupply()).to.equal(GENESIS_SUPPLY);
    });
  });

  describe('UUPS Upgrade', () => {
    it('should allow UPGRADER_ROLE to upgrade', async () => {
      // Re-deploy same implementation as a mock upgrade
      const factory = await ethers.getContractFactory('ExtendedPointToken', admin);
      const impl2 = await factory.deploy();
      await impl2.waitForDeployment();

      await xp.connect(admin).upgradeToAndCall(await impl2.getAddress(), '0x');
      // If no revert, upgrade succeeded
      expect(await xp.name()).to.equal('Extended Point');
    });

    it('should revert upgrade without UPGRADER_ROLE', async () => {
      const factory = await ethers.getContractFactory('ExtendedPointToken', admin);
      const impl2 = await factory.deploy();
      await impl2.waitForDeployment();

      await expect(
        xp.connect(user).upgradeToAndCall(await impl2.getAddress(), '0x'),
      ).to.be.revertedWithCustomError(xp, 'AccessControlUnauthorizedAccount');
    });
  });
});
