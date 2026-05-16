import { run } from 'hardhat';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const network = process.env.HARDHAT_NETWORK || 'amoy';
  const deploymentPath = join(__dirname, '..', 'deployments', `deployment-${network}.json`);

  let deploymentData: unknown;
  try {
    deploymentData = JSON.parse(readFileSync(deploymentPath, 'utf-8'));
  } catch {
    console.error(`Deployment artifact not found at ${deploymentPath}`);
    console.error('Run deploy script first.');
    process.exit(1);
  }

  const contracts = (
    deploymentData as { contracts: Record<string, { proxy: string; implementation: string }> }
  ).contracts;

  for (const [name, { implementation }] of Object.entries(contracts)) {
    console.log(`Verifying ${name} implementation at ${implementation}...`);
    try {
      await run('verify:verify', {
        address: implementation,
        constructorArguments: [],
      });
      console.log(`${name} verified successfully.\n`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('already verified')) {
        console.log(`${name} is already verified.\n`);
      } else {
        console.error(`Failed to verify ${name}:`, message);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
