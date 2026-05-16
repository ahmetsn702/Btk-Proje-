import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { Exchange, CategoryPoints1155, ExtendedPointToken } from '../typechain-types';

describe('Exchange', () => {
  let exchange: Exchange;
  let cp: CategoryPoints1155;
  let xp: ExtendedPointToken;
  let admin: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;

  const CAT_GIYIM = 1n;
  const CAT_ELEKTRONIK = 2n;
  const CAT_KITAP = 3n;

  beforeEach(async () => {
    [admin, , treasury] = await ethers.getSigners();

    // Deploy XP
    const xpFactory = await ethers.getContractFactory('ExtendedPointToken', admin);
    xp = (await upgrades.deployProxy(xpFactory, [admin.address], {
      kind: 'uups',
    })) as unknown as ExtendedPointToken;
    await xp.waitForDeployment();

    // Deploy CP
    const cpFactory = await ethers.getContractFactory('CategoryPoints1155', admin);
    cp = (await upgrades.deployProxy(
      cpFactory,
      ['https://api.example.com/metadata/', admin.address],
      {
        kind: 'uups',
      },
    )) as unknown as CategoryPoints1155;
    await cp.waitForDeployment();

    // Grant MINTER_ROLE to admin so it can mint CP for liquidity
    await cp.connect(admin).grantRole(await cp.MINTER_ROLE(), admin.address);

    // Deploy Exchange
    const exFactory = await ethers.getContractFactory('Exchange', admin);
    exchange = (await upgrades.deployProxy(
      exFactory,
      [admin.address, await xp.getAddress(), await cp.getAddress(), treasury.address],
      {
        kind: 'uups',
      },
    )) as unknown as Exchange;
    await exchange.waitForDeployment();

    // Grant MINTER_ROLE to Exchange so it can mint CP during addInitialLiquidity
    await cp.connect(admin).grantRole(await cp.MINTER_ROLE(), await exchange.getAddress());

    // Mint initial XP to admin for liquidity
    await xp.connect(admin).genesisMint(admin.address);

    // Mint initial CP to admin for liquidity (admin has MINTER_ROLE)
    await cp.connect(admin).mint(admin.address, CAT_GIYIM, 500_000n * 10n ** 18n);
    await cp.connect(admin).mint(admin.address, CAT_ELEKTRONIK, 300_000n * 10n ** 18n);
    await cp.connect(admin).mint(admin.address, CAT_KITAP, 200_000n * 10n ** 18n);

    // Approve Exchange to spend admin's XP and CP
    await xp.connect(admin).approve(await exchange.getAddress(), ethers.MaxUint256);
    await cp.connect(admin).setApprovalForAll(await exchange.getAddress(), true);

    // Add initial liquidity (required for getQuote)
    await exchange
      .connect(admin)
      .addInitialLiquidity(
        1_000_000n * 10n ** 18n,
        [CAT_GIYIM, CAT_ELEKTRONIK, CAT_KITAP],
        [500_000n * 10n ** 18n, 300_000n * 10n ** 18n, 200_000n * 10n ** 18n],
      );
  });

  describe('Deployment', () => {
    it('should have correct tokens', async () => {
      expect(await exchange.xpToken()).to.equal(await xp.getAddress());
      expect(await exchange.cpToken()).to.equal(await cp.getAddress());
    });

    it('should have liquidity', async () => {
      expect(await exchange.xpPool()).to.equal(1_000_000n * 10n ** 18n);
      expect(await exchange.cpPool(CAT_GIYIM)).to.equal(500_000n * 10n ** 18n);
    });
  });

  describe('getQuote', () => {
    it('should return correct quote', async () => {
      const [amountOut, fee] = await exchange.getQuote(CAT_GIYIM, CAT_ELEKTRONIK, 1000n);
      expect(fee).to.equal(3n); // %0.3 of 1000
      expect(amountOut).to.be.gt(0);
    });
  });
});
