export * from './types'

import type {
  BytesLike,
  DecodeFailure,
  DecodeOptions,
  DecodeResult,
  DecodeErrorDetails,
  DecodeErrorKind,
  ReplayData,
  ValidationProfile,
  ValidationReport,
} from './types'

export declare class ReplayDecodeError extends Error {
  name: 'ReplayDecodeError'
  kind: DecodeErrorKind
  details: DecodeErrorDetails
  constructor(error: DecodeFailure)
}

export declare function decode(bytes: BytesLike, options?: DecodeOptions): ReplayData
export declare function decodeAsync(bytes: BytesLike, options?: DecodeOptions): Promise<ReplayData>

export declare function tryDecode(bytes: BytesLike, options?: DecodeOptions): DecodeResult
export declare function tryDecodeAsync(bytes: BytesLike, options?: DecodeOptions): Promise<DecodeResult>

export declare function validate(bytes: BytesLike, profile?: ValidationProfile): ValidationReport
export declare function validateAsync(bytes: BytesLike, profile?: ValidationProfile): Promise<ValidationReport>
