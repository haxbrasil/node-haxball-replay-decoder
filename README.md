# @hax-brasil/replay-decoder

Node.js native decoder and validator for Haxball `HBR2` replay files.

This package wraps [`haxball-replay-decoder`](https://crates.io/crates/haxball-replay-decoder) with N-API and exposes:

- sync + async replay decoding
- sync + async replay validation
- rich structured decode errors
- full TypeScript types for decoded replay structures and validation reports

## Install

```bash
pnpm add @hax-brasil/replay-decoder
```

## Usage

```ts
import { decode, validate, tryDecode, ReplayDecodeError } from '@hax-brasil/replay-decoder'
import { readFileSync } from 'node:fs'

const bytes = readFileSync('./recording.hbr2')

const replay = decode(bytes)
console.log(replay.version, replay.totalFrames)

const report = validate(bytes, 'strict')
console.log(report.issues)

const safe = tryDecode(bytes)
if (!safe.ok) {
  console.error(safe.error.kind, safe.error.details)
}

try {
  decode(Buffer.from('bad'))
} catch (error) {
  if (error instanceof ReplayDecodeError) {
    console.error(error.kind, error.details)
  }
}
```

## API

- `decode(bytes, options?) => ReplayData`
- `decodeAsync(bytes, options?) => Promise<ReplayData>`
- `tryDecode(bytes, options?) => DecodeResult`
- `tryDecodeAsync(bytes, options?) => Promise<DecodeResult>`
- `validate(bytes, profile?) => ValidationReport`
- `validateAsync(bytes, profile?) => Promise<ValidationReport>`

### Input

All APIs accept only bytes:

- `Buffer`
- `Uint8Array`

### Decode options

```ts
interface DecodeOptions {
  validationProfile?: 'strict' | 'structural'
  allowUnknownEventTypes?: boolean
}
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```
