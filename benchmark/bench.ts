import { readFileSync } from 'node:fs'
import { Bench } from 'tinybench'
import { decode } from '../index.js'

const fixturePath = new URL('../__test__/fixtures/recording-01.hbr2', import.meta.url)
const fixtureBytes = readFileSync(fixturePath)

const b = new Bench()

b.add('Native decode fixture', () => {
  decode(fixtureBytes)
})

await b.run()

console.table(b.table())
