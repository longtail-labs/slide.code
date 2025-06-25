#!/usr/bin/env node

import { readdir } from 'fs/promises'
import { join, relative } from 'path'
import { createInterface } from 'readline'
import { exec } from 'child_process'

const TEST_DIR = join(process.cwd(), 'src', '__tests__')

async function main() {
  try {
    // Get all test files
    const files = await readdir(TEST_DIR)
    const testFiles = files.filter((file) => file.endsWith('.test.ts'))

    if (testFiles.length === 0) {
      console.log('No test files found')
      return
    }

    // Display test files with numbers
    console.log('Available test files:')
    testFiles.forEach((file, index) => {
      console.log(`${index + 1}: ${file}`)
    })

    // Create readline interface
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    })

    // Ask for user selection
    rl.question(
      'Enter the number of the test file to run (or "all" to run all tests): ',
      (answer) => {
        rl.close()

        if (answer.toLowerCase() === 'all') {
          runVitest('')
        } else {
          const num = parseInt(answer)
          if (isNaN(num) || num < 1 || num > testFiles.length) {
            console.log('Invalid selection')
            return
          }

          const selectedFile = testFiles[num - 1]
          const relativePath = join('src', '__tests__', selectedFile)
          runVitest(relativePath)
        }
      }
    )
  } catch (error) {
    console.error('Error:', error)
  }
}

function runVitest(testPath: string) {
  const command = testPath ? `npx vitest run ${testPath}` : 'npx vitest run'

  console.log(`Running: ${command}`)

  const child = exec(command)

  child.stdout?.pipe(process.stdout)
  child.stderr?.pipe(process.stderr)

  child.on('exit', (code) => {
    process.exit(code || 0)
  })
}

main()
