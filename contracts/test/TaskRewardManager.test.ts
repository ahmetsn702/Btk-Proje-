/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { TaskRewardManager, CategoryPoints1155 } from '../typechain-types';
import '@nomicfoundation/hardhat-chai-matchers';

describe('TaskRewardManager', () => {
  let trm: TaskRewardManager;
  let cp: CategoryPoints1155;
  let admin: HardhatEthersSigner;
  let minter: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  const CATEGORY_GIYIM = 1n;

  beforeEach(async () => {
    [admin, minter, user] = await ethers.getSigners();

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

    // Deploy TRM
    const trmFactory = await ethers.getContractFactory('TaskRewardManager', admin);
    trm = (await upgrades.deployProxy(trmFactory, [admin.address, await cp.getAddress()], {
      kind: 'uups',
    })) as unknown as TaskRewardManager;
    await trm.waitForDeployment();

    // Grant MINTER_ROLE to TRM on CP
    await cp.connect(admin).grantRole(await cp.MINTER_ROLE(), await trm.getAddress());
    // Grant MINTER_ROLE to minter on TRM (for completeTask calls)
    await trm.connect(admin).grantRole(await cp.MINTER_ROLE(), minter.address);
  });

  describe('Deployment', () => {
    it('should set CP token address', async () => {
      expect(await trm.cpToken()).to.equal(await cp.getAddress());
    });

    it('should assign DEFAULT_ADMIN_ROLE to deployer', async () => {
      expect(await trm.hasRole(await trm.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    });
  });

  describe('completeTask', () => {
    it('should mint CP on task completion', async () => {
      await trm.connect(minter).completeTask(0, user.address, CATEGORY_GIYIM, 'review#123'); // ProductReview=0
      const balance = await cp.balanceOf(user.address, CATEGORY_GIYIM);
      expect(balance).to.equal(100n * 10n ** 18n); // defaultReward for ProductReview
    });

    it('should revert if caller lacks MINTER_ROLE', async () => {
      await expect(trm.connect(user).completeTask(0, user.address, CATEGORY_GIYIM, 'review#123')).to
        .be.reverted;
    });

    it('should emit TaskCompleted event', async () => {
      const tx = await trm
        .connect(minter)
        .completeTask(0, user.address, CATEGORY_GIYIM, 'review#123');
      const receipt = await tx.wait();
      const event = receipt?.logs.find((l) => {
        return (
          (l as { topics?: readonly unknown[] }).topics &&
          (l as { fragment?: { name: string } }).fragment?.name === 'TaskCompleted'
        );
      });
      expect(event).to.not.be.undefined;
      if (event) {
        const parsed = trm.interface.parseLog({
          topics: (event as { topics: readonly unknown[] }).topics as readonly string[],
          data: (event as { data: string }).data,
        });
        // Event: TaskCompleted(uint256 completionId, TaskType taskType, address user, uint256 categoryId, uint256 amount, uint256 timestamp, string metadata)
        expect(parsed?.args[2]).to.equal(user.address);
        expect(parsed?.args[3]).to.equal(CATEGORY_GIYIM);
        expect(parsed?.args[4]).to.equal(100n * 10n ** 18n);
        expect(parsed?.args[6]).to.equal('review#123');
      }
    });
  });

  describe('batchMint', () => {
    it('should batch mint CP to multiple users', async () => {
      const recipients = [user.address, minter.address];
      const amounts = [50n * 10n ** 18n, 75n * 10n ** 18n];
      await trm.connect(minter).batchMint(CATEGORY_GIYIM, recipients, amounts);

      expect(await cp.balanceOf(user.address, CATEGORY_GIYIM)).to.equal(50n * 10n ** 18n);
      expect(await cp.balanceOf(minter.address, CATEGORY_GIYIM)).to.equal(75n * 10n ** 18n);
    });

    it('should revert on array length mismatch', async () => {
      await expect(
        trm.connect(minter).batchMint(CATEGORY_GIYIM, [user.address], [1n, 2n]),
      ).to.be.revertedWith('TRM: array length mismatch');
    });
  });

  describe('Admin', () => {
    it('should allow admin to set default reward', async () => {
      await trm.connect(admin).setDefaultReward(0, 200n * 10n ** 18n);
      await trm.connect(minter).completeTask(0, user.address, CATEGORY_GIYIM, 'review#456');
      expect(await cp.balanceOf(user.address, CATEGORY_GIYIM)).to.equal(200n * 10n ** 18n);
    });
  });
});
