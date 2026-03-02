import { readFileSync } from 'node:fs'

import test from 'ava'

import { ReplayDecodeError, decode, decodeAsync, tryDecode, tryDecodeAsync, validate, validateAsync } from '../index'
import type { EventPayload, ValidationReport } from '../types'

const fixturePath = new URL('./fixtures/recording-01.hbr2', import.meta.url)
const fixtureBytes = readFileSync(fixturePath)

const countEventKinds = (payloads: EventPayload[]) => {
  const counts = new Map<string, number>()
  for (const payload of payloads) {
    counts.set(payload.kind, (counts.get(payload.kind) ?? 0) + 1)
  }
  return counts
}

test('decode fixture sync', (t) => {
  const replay = decode(fixtureBytes)

  t.is(replay.version, 3)
  t.is(replay.totalFrames, 824)
  t.is(replay.goalMarkers.length, 0)
  t.is(replay.events.length, 89)

  const eventCounts = countEventKinds(replay.events.map((event) => event.payload))
  t.is(eventCounts.get('sendInput'), 84)
  t.is(eventCounts.get('ping'), 5)

  t.is(replay.roomData.name, "gabinho's room")
  t.is(replay.roomData.players.length, 1)

  const stadium = replay.roomData.stadium
  t.is(stadium.defaultStadiumId, 255)
  t.is(stadium.name, 'SBBHax.com [NOVO SITE]')
  t.is(stadium.vertices.length, 55)
  t.is(stadium.segments.length, 25)
  t.is(stadium.planes.length, 6)
  t.is(stadium.goals.length, 2)
  t.is(stadium.discs.length, 39)
})

test('decode fixture async matches sync', async (t) => {
  const [syncDecoded, asyncDecoded] = await Promise.all([
    Promise.resolve(decode(fixtureBytes)),
    decodeAsync(fixtureBytes),
  ])

  t.deepEqual(asyncDecoded, syncDecoded)

  const asyncResult = await tryDecodeAsync(fixtureBytes)
  t.true(asyncResult.ok)
})

test('validate fixture sync and async', async (t) => {
  const syncReport = validate(fixtureBytes)
  const asyncReport = await validateAsync(fixtureBytes, 'strict')

  t.deepEqual(asyncReport, syncReport)
  t.is(syncReport.profile, 'strict')
  t.true(syncReport.issues.every((issue) => issue.severity !== 'error'))
})

test('tryDecode returns structured errors and decode throws ReplayDecodeError', (t) => {
  const corrupted = Buffer.from(fixtureBytes)
  corrupted[0] = 0x58

  const result = tryDecode(corrupted)
  t.false(result.ok)

  if (!result.ok) {
    t.is(result.error.kind, 'invalidMagic')
    t.is(result.error.details.kind, 'invalidMagic')
    if (result.error.details.kind === 'invalidMagic') {
      t.true(Array.isArray(result.error.details.found))
      t.is(result.error.details.found.length, 4)
    } else {
      t.fail('expected invalidMagic details')
    }
  }

  const thrown = t.throws(() => decode(corrupted), {
    instanceOf: ReplayDecodeError,
  })
  t.truthy(thrown)
  t.is(thrown?.kind, 'invalidMagic')
  t.is(thrown?.details.kind, 'invalidMagic')
})

test('bytes compatibility and invalid input guard', async (t) => {
  const fromBuffer = decode(Buffer.from(fixtureBytes))
  const fromUint8 = decode(new Uint8Array(fixtureBytes))
  const asyncFromUint8 = await decodeAsync(new Uint8Array(fixtureBytes))

  t.deepEqual(fromBuffer, fromUint8)
  t.deepEqual(fromBuffer, asyncFromUint8)

  const invalidInput = 'not-bytes' as unknown as Uint8Array
  const error = t.throws(() => decode(invalidInput), { instanceOf: TypeError })
  t.regex(error?.message ?? '', /Buffer or Uint8Array/)
})

test('type surface smoke', (t) => {
  const report: ValidationReport = validate(fixtureBytes, 'strict')
  const replay = decode(fixtureBytes)

  const firstPayload = replay.events[0]?.payload
  if (firstPayload?.kind === 'sendInput') {
    const inputValue: number = firstPayload.value.input
    t.true(typeof inputValue === 'number')
  } else {
    t.pass()
  }

  t.true(report.profile === 'strict' || report.profile === 'structural')
})
