const path = require('path')
const fs = require('fs')

const importAbi = (name, artifacePath = '') => {
  try {
    const sourcePath = path.resolve(
      `../protocol/artifacts/contracts/${artifacePath}${name}.sol/${name}.json`,
    )
    const artifact = JSON.parse(fs.readFileSync(sourcePath, { encoding: 'utf8' }))

    const destPath = path.resolve(`./abis/${name.toLowerCase()}.json`)
    fs.writeFileSync(destPath, JSON.stringify(artifact.abi, null, '\t'), 'utf8')
  } catch (error) {
    console.log(`ABI of ${name} contract's not found`)
  }
}

importAbi('Pool', 'Pool/')
importAbi('PoolHarness', 'mock/')
importAbi('PoolFactory', 'Pool/')
importAbi('PoolFactoryHarness', 'mock/')
importAbi('Prime', 'PrimeMembership/')
