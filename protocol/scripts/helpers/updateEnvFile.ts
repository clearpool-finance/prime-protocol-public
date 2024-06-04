import fs from 'fs'
import dotenv from 'dotenv'
import path from 'path'

export default function updateEnvFile(
  values: { [key: string]: any },
  filePath?: string,
  prefix?: string,
) {
  if (!filePath) {
    filePath = path.resolve('.env')
  }

  const data = fs.readFileSync(filePath)
  const valuesToAdd = { ...values }

  if (!prefix) {
    prefix = ''
  }

  const result = data
    .toString()
    .split('\n')
    .map((str) => {
      if (str) {
        let [key] = str.split('=')

        if (prefix) {
          key = key.replace(prefix, '')
        }

        if (key in values) {
          delete valuesToAdd[key]
          return `${prefix}${key}=${values[key]}`
        }
      }

      return str
    })

  Object.keys(valuesToAdd).forEach((key) => {
    const value = valuesToAdd[key]

    result.push(`${prefix}${key}=${value}`)
  })

  fs.writeFileSync(filePath, result.join('\n'), 'utf8')

  // override process.env
  const envConfig = dotenv.parse(fs.readFileSync(filePath))

  for (const k in envConfig) {
    process.env[k] = envConfig[k]
  }
}
