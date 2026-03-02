// prettier-ignore
/* eslint-disable */

const { readFileSync } = require('node:fs')

const loadErrors = []

const isMusl = () => {
  let musl = false
  if (process.platform === 'linux') {
    musl = isMuslFromFilesystem()
    if (musl === null) {
      musl = isMuslFromReport()
    }
    if (musl === null) {
      musl = isMuslFromChildProcess()
    }
  }
  return musl
}

const isFileMusl = (file) => file.includes('libc.musl-') || file.includes('ld-musl-')

const isMuslFromFilesystem = () => {
  try {
    return readFileSync('/usr/bin/ldd', 'utf-8').includes('musl')
  } catch {
    return null
  }
}

const isMuslFromReport = () => {
  let report = null
  if (typeof process.report?.getReport === 'function') {
    process.report.excludeNetwork = true
    report = process.report.getReport()
  }
  if (!report) {
    return null
  }
  if (report.header && report.header.glibcVersionRuntime) {
    return false
  }
  if (Array.isArray(report.sharedObjects)) {
    if (report.sharedObjects.some(isFileMusl)) {
      return true
    }
  }
  return false
}

const isMuslFromChildProcess = () => {
  try {
    return require('child_process').execSync('ldd --version', { encoding: 'utf8' }).includes('musl')
  } catch {
    return false
  }
}

const makeCandidates = () => {
  const candidates = []
  const add = (localFile, packageName) => {
    candidates.push({ type: 'local', id: localFile })
    candidates.push({ type: 'package', id: packageName })
  }

  const { platform, arch } = process

  if (platform === 'win32') {
    if (arch === 'x64') {
      add('./replay-decoder.win32-x64-msvc.node', '@hax-brasil/replay-decoder-win32-x64-msvc')
      return candidates
    }
    if (arch === 'arm64') {
      add('./replay-decoder.win32-arm64-msvc.node', '@hax-brasil/replay-decoder-win32-arm64-msvc')
      return candidates
    }
    throw new Error(`Unsupported Windows architecture: ${arch}`)
  }

  if (platform === 'darwin') {
    add('./replay-decoder.darwin-universal.node', '@hax-brasil/replay-decoder-darwin-universal')

    if (arch === 'x64') {
      add('./replay-decoder.darwin-x64.node', '@hax-brasil/replay-decoder-darwin-x64')
      return candidates
    }
    if (arch === 'arm64') {
      add('./replay-decoder.darwin-arm64.node', '@hax-brasil/replay-decoder-darwin-arm64')
      return candidates
    }
    throw new Error(`Unsupported macOS architecture: ${arch}`)
  }

  if (platform === 'linux') {
    const musl = isMusl()

    if (arch === 'x64') {
      if (musl) {
        add('./replay-decoder.linux-x64-musl.node', '@hax-brasil/replay-decoder-linux-x64-musl')
      }
      add('./replay-decoder.linux-x64-gnu.node', '@hax-brasil/replay-decoder-linux-x64-gnu')
      return candidates
    }

    if (arch === 'arm64') {
      if (musl) {
        add('./replay-decoder.linux-arm64-musl.node', '@hax-brasil/replay-decoder-linux-arm64-musl')
      }
      add('./replay-decoder.linux-arm64-gnu.node', '@hax-brasil/replay-decoder-linux-arm64-gnu')
      return candidates
    }

    throw new Error(`Unsupported Linux architecture: ${arch}`)
  }

  throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`)
}

const loadNativeBinding = () => {
  if (process.env.NAPI_RS_NATIVE_LIBRARY_PATH) {
    try {
      return require(process.env.NAPI_RS_NATIVE_LIBRARY_PATH)
    } catch (error) {
      loadErrors.push(error)
    }
  }

  let candidates = []
  try {
    candidates = makeCandidates()
  } catch (error) {
    loadErrors.push(error)
  }

  for (const candidate of candidates) {
    try {
      return require(candidate.id)
    } catch (error) {
      loadErrors.push(error)
    }
  }

  if (loadErrors.length > 0) {
    throw new Error('Failed to load native @hax-brasil/replay-decoder binding', {
      cause: loadErrors.reduce((error, current) => {
        current.cause = error
        return current
      }),
    })
  }

  throw new Error('Native binding was not loaded')
}

const nativeBinding = loadNativeBinding()

class ReplayDecodeError extends Error {
  constructor(error) {
    super(error.message)
    this.name = 'ReplayDecodeError'
    this.kind = error.kind
    this.details = error.details
  }
}

const normalizeBytesLike = (bytes) => {
  if (Buffer.isBuffer(bytes)) {
    return bytes
  }
  if (bytes instanceof Uint8Array) {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  throw new TypeError('Expected bytes to be a Buffer or Uint8Array')
}

const normalizeValidationProfile = (profile) => {
  if (profile == null) {
    return 'strict'
  }
  if (profile === 'strict' || profile === 'structural') {
    return profile
  }
  throw new TypeError("validationProfile must be 'strict' or 'structural'")
}

const normalizeDecodeOptions = (options) => {
  if (options == null) {
    return undefined
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('decode options must be an object')
  }

  const normalized = {}

  if (Object.hasOwn(options, 'validationProfile') && options.validationProfile !== undefined) {
    normalized.validationProfile = normalizeValidationProfile(options.validationProfile)
  }

  if (Object.hasOwn(options, 'allowUnknownEventTypes') && options.allowUnknownEventTypes !== undefined) {
    if (typeof options.allowUnknownEventTypes !== 'boolean') {
      throw new TypeError('allowUnknownEventTypes must be a boolean')
    }
    normalized.allowUnknownEventTypes = options.allowUnknownEventTypes
  }

  if (Object.keys(normalized).length === 0) {
    return undefined
  }

  return normalized
}

const parseNativeJson = (raw, apiName) => {
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`Native ${apiName} returned invalid JSON`, { cause: error })
  }
}

const decodeTrySyncInternal = (bytes, options) => {
  const normalizedBytes = normalizeBytesLike(bytes)
  const normalizedOptions = normalizeDecodeOptions(options)
  const optionsJson = normalizedOptions ? JSON.stringify(normalizedOptions) : undefined
  const raw = nativeBinding.__decode_try_json_sync(normalizedBytes, optionsJson)
  return parseNativeJson(raw, '__decode_try_json_sync')
}

const decodeTryAsyncInternal = async (bytes, options) => {
  const normalizedBytes = normalizeBytesLike(bytes)
  const normalizedOptions = normalizeDecodeOptions(options)
  const optionsJson = normalizedOptions ? JSON.stringify(normalizedOptions) : undefined
  const raw = await nativeBinding.__decode_try_json_async(normalizedBytes, optionsJson)
  return parseNativeJson(raw, '__decode_try_json_async')
}

const validateSyncInternal = (bytes, profile) => {
  const normalizedBytes = normalizeBytesLike(bytes)
  const normalizedProfile = normalizeValidationProfile(profile)
  const raw = nativeBinding.__validate_json_sync(normalizedBytes, normalizedProfile)
  return parseNativeJson(raw, '__validate_json_sync')
}

const validateAsyncInternal = async (bytes, profile) => {
  const normalizedBytes = normalizeBytesLike(bytes)
  const normalizedProfile = normalizeValidationProfile(profile)
  const raw = await nativeBinding.__validate_json_async(normalizedBytes, normalizedProfile)
  return parseNativeJson(raw, '__validate_json_async')
}

const decode = (bytes, options) => {
  const result = decodeTrySyncInternal(bytes, options)
  if (result.ok) {
    return result.data
  }
  throw new ReplayDecodeError(result.error)
}

const decodeAsync = async (bytes, options) => {
  const result = await decodeTryAsyncInternal(bytes, options)
  if (result.ok) {
    return result.data
  }
  throw new ReplayDecodeError(result.error)
}

const tryDecode = (bytes, options) => decodeTrySyncInternal(bytes, options)

const tryDecodeAsync = async (bytes, options) => decodeTryAsyncInternal(bytes, options)

const validate = (bytes, profile) => validateSyncInternal(bytes, profile)

const validateAsync = async (bytes, profile) => validateAsyncInternal(bytes, profile)

module.exports = {
  ReplayDecodeError,
  decode,
  decodeAsync,
  tryDecode,
  tryDecodeAsync,
  validate,
  validateAsync,
}

module.exports.ReplayDecodeError = ReplayDecodeError
module.exports.decode = decode
module.exports.decodeAsync = decodeAsync
module.exports.tryDecode = tryDecode
module.exports.tryDecodeAsync = tryDecodeAsync
module.exports.validate = validate
module.exports.validateAsync = validateAsync
