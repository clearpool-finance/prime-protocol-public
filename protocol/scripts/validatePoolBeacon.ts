import { deployments, ethers, upgrades } from 'hardhat'


async function main() {
    console.log('Deploying new PoolBeacon implementation...')

    const PoolBeacon = await ethers.getContractFactory('Pool')
    const currentDeployment = await deployments.get('Pool');

    await upgrades.validateUpgrade(currentDeployment.address, PoolBeacon, {
        kind: 'beacon'
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
