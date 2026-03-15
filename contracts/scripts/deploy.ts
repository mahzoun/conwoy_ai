import { ethers, network } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying GameEscrow...');
  console.log('Network:', network.name);
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');

  // Configuration
  const BACKEND_SIGNER = process.env['BACKEND_SIGNER_ADDRESS'] ?? deployer.address;
  const PLATFORM_FEE_BPS = 250; // 2.5%

  console.log('\nDeployment config:');
  console.log('  Backend signer:', BACKEND_SIGNER);
  console.log('  Platform fee:', PLATFORM_FEE_BPS / 100, '%');

  // Deploy
  const GameEscrowFactory = await ethers.getContractFactory('GameEscrow');
  const escrow = await GameEscrowFactory.deploy(BACKEND_SIGNER, PLATFORM_FEE_BPS);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log('\nGameEscrow deployed to:', address);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    address,
    backendSigner: BACKEND_SIGNER,
    platformFeeBps: PLATFORM_FEE_BPS,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    txHash: escrow.deploymentTransaction()?.hash,
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log('\nDeployment info saved to:', deploymentFile);

  // Verify (if not localhost)
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('\nWaiting 5 blocks for Etherscan to index...');
    await escrow.deploymentTransaction()?.wait(5);

    try {
      const { run } = await import('hardhat');
      await run('verify:verify', {
        address,
        constructorArguments: [BACKEND_SIGNER, PLATFORM_FEE_BPS],
      });
      console.log('Contract verified on Etherscan!');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Already Verified')) {
        console.log('Contract already verified');
      } else {
        console.error('Verification failed:', err);
      }
    }
  }

  return deploymentInfo;
}

main()
  .then(info => {
    console.log('\nDeployment complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
