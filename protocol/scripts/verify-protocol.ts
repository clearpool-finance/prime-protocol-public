import { run } from 'hardhat';

async function main() {
    await run('etherscan-verify')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
