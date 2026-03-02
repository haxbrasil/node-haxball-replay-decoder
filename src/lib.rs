#![deny(clippy::all)]

use haxball_replay_decoder::{
  decode_with_options, validate_with_profile, DecodeError, DecodeOptions, ReplayData,
  ValidationProfile, ValidationReport,
};
use napi::bindgen_prelude::{AsyncTask, Buffer};
use napi::{Env, Error as NapiError, Result as NapiResult, Status, Task};
use napi_derive::napi;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct DecodeOptionsInput {
  validation_profile: Option<String>,
  allow_unknown_event_types: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DecodeFailure {
  kind: DecodeErrorKind,
  message: String,
  details: DecodeErrorDetails,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
enum DecodeErrorKind {
  InvalidMagic,
  UnexpectedEof,
  InvalidVarInt,
  InvalidUtf8,
  InvalidJson,
  Compression,
  IncompleteCompression,
  TrailingCompressedData,
  UnsupportedReplayVersion,
  UnsupportedEventType,
  UnknownEventBoundaryUnsupported,
  IntegerOverflow,
  TrailingBytes,
  ValidationFailed,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
enum DecodeErrorDetails {
  InvalidMagic { found: Vec<u8> },
  UnexpectedEof { context: String },
  InvalidVarInt { context: String },
  InvalidUtf8 { context: String, source: String },
  InvalidJson { context: String, source: String },
  Compression { context: String, source: String },
  IncompleteCompression { context: String },
  TrailingCompressedData { context: String },
  UnsupportedReplayVersion { version: u32 },
  UnsupportedEventType { event_type: u8 },
  UnknownEventBoundaryUnsupported { event_type: u8 },
  IntegerOverflow { context: String },
  TrailingBytes { context: String, remaining: usize },
  ValidationFailed { report: ValidationReport },
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
#[allow(clippy::large_enum_variant)]
enum DecodeTryResult {
  Ok { ok: bool, data: ReplayData },
  Err { ok: bool, error: DecodeFailure },
}

impl DecodeTryResult {
  fn ok(data: ReplayData) -> Self {
    Self::Ok { ok: true, data }
  }

  fn err(error: DecodeError) -> Self {
    Self::Err {
      ok: false,
      error: map_decode_error(error),
    }
  }
}

pub struct DecodeTask {
  bytes: Vec<u8>,
  options: DecodeOptions,
}

impl Task for DecodeTask {
  type Output = String;
  type JsValue = String;

  fn compute(&mut self) -> NapiResult<Self::Output> {
    run_decode_try_json(&self.bytes, self.options.clone())
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> NapiResult<Self::JsValue> {
    Ok(output)
  }
}

pub struct ValidateTask {
  bytes: Vec<u8>,
  profile: ValidationProfile,
}

impl Task for ValidateTask {
  type Output = String;
  type JsValue = String;

  fn compute(&mut self) -> NapiResult<Self::Output> {
    run_validate_json(&self.bytes, self.profile)
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> NapiResult<Self::JsValue> {
    Ok(output)
  }
}

#[napi(js_name = "__decode_try_json_sync")]
pub fn __decode_try_json_sync(bytes: Buffer, options_json: Option<String>) -> NapiResult<String> {
  let options = parse_decode_options(options_json)?;
  run_decode_try_json(&bytes, options)
}

#[napi(js_name = "__decode_try_json_async")]
pub fn __decode_try_json_async(
  bytes: Buffer,
  options_json: Option<String>,
) -> NapiResult<AsyncTask<DecodeTask>> {
  let options = parse_decode_options(options_json)?;
  let task = DecodeTask {
    bytes: bytes.to_vec(),
    options,
  };
  Ok(AsyncTask::new(task))
}

#[napi(js_name = "__validate_json_sync")]
pub fn __validate_json_sync(bytes: Buffer, profile: Option<String>) -> NapiResult<String> {
  let profile = parse_profile(profile.as_deref())?;
  run_validate_json(&bytes, profile)
}

#[napi(js_name = "__validate_json_async")]
pub fn __validate_json_async(
  bytes: Buffer,
  profile: Option<String>,
) -> NapiResult<AsyncTask<ValidateTask>> {
  let profile = parse_profile(profile.as_deref())?;
  let task = ValidateTask {
    bytes: bytes.to_vec(),
    profile,
  };
  Ok(AsyncTask::new(task))
}

fn run_decode_try_json(bytes: &[u8], options: DecodeOptions) -> NapiResult<String> {
  let result = match decode_with_options(bytes, options) {
    Ok(data) => DecodeTryResult::ok(data),
    Err(error) => DecodeTryResult::err(error),
  };

  serde_json::to_string(&result)
    .map_err(|error| internal_error(format!("failed to serialize decode result JSON: {error}")))
}

fn run_validate_json(bytes: &[u8], profile: ValidationProfile) -> NapiResult<String> {
  let report = validate_with_profile(bytes, profile);
  serde_json::to_string(&report).map_err(|error| {
    internal_error(format!(
      "failed to serialize validation report JSON: {error}"
    ))
  })
}

fn parse_decode_options(options_json: Option<String>) -> NapiResult<DecodeOptions> {
  let Some(options_json) = options_json else {
    return Ok(DecodeOptions::default());
  };

  let input: DecodeOptionsInput = serde_json::from_str(&options_json)
    .map_err(|error| invalid_arg(format!("invalid decode options JSON: {error}")))?;

  let validation_profile = parse_profile(input.validation_profile.as_deref())?;
  let allow_unknown_event_types = input.allow_unknown_event_types.unwrap_or(false);

  Ok(DecodeOptions {
    validation_profile,
    allow_unknown_event_types,
  })
}

fn parse_profile(profile: Option<&str>) -> NapiResult<ValidationProfile> {
  let Some(profile) = profile else {
    return Ok(ValidationProfile::Strict);
  };

  if profile.eq_ignore_ascii_case("strict") {
    return Ok(ValidationProfile::Strict);
  }

  if profile.eq_ignore_ascii_case("structural") {
    return Ok(ValidationProfile::Structural);
  }

  Err(invalid_arg(format!(
    "invalid validation profile '{profile}', expected 'strict' or 'structural'"
  )))
}

fn map_decode_error(error: DecodeError) -> DecodeFailure {
  let message = error.to_string();

  let (kind, details) = match error {
    DecodeError::InvalidMagic { found } => (
      DecodeErrorKind::InvalidMagic,
      DecodeErrorDetails::InvalidMagic {
        found: found.to_vec(),
      },
    ),
    DecodeError::UnexpectedEof { context } => (
      DecodeErrorKind::UnexpectedEof,
      DecodeErrorDetails::UnexpectedEof { context },
    ),
    DecodeError::InvalidVarInt { context } => (
      DecodeErrorKind::InvalidVarInt,
      DecodeErrorDetails::InvalidVarInt { context },
    ),
    DecodeError::InvalidUtf8 { context, source } => (
      DecodeErrorKind::InvalidUtf8,
      DecodeErrorDetails::InvalidUtf8 {
        context,
        source: source.to_string(),
      },
    ),
    DecodeError::InvalidJson { context, source } => (
      DecodeErrorKind::InvalidJson,
      DecodeErrorDetails::InvalidJson {
        context,
        source: source.to_string(),
      },
    ),
    DecodeError::Compression { context, source } => (
      DecodeErrorKind::Compression,
      DecodeErrorDetails::Compression {
        context,
        source: source.to_string(),
      },
    ),
    DecodeError::IncompleteCompression { context } => (
      DecodeErrorKind::IncompleteCompression,
      DecodeErrorDetails::IncompleteCompression { context },
    ),
    DecodeError::TrailingCompressedData { context } => (
      DecodeErrorKind::TrailingCompressedData,
      DecodeErrorDetails::TrailingCompressedData { context },
    ),
    DecodeError::UnsupportedReplayVersion(version) => (
      DecodeErrorKind::UnsupportedReplayVersion,
      DecodeErrorDetails::UnsupportedReplayVersion { version },
    ),
    DecodeError::UnsupportedEventType(event_type) => (
      DecodeErrorKind::UnsupportedEventType,
      DecodeErrorDetails::UnsupportedEventType { event_type },
    ),
    DecodeError::UnknownEventBoundaryUnsupported { event_type } => (
      DecodeErrorKind::UnknownEventBoundaryUnsupported,
      DecodeErrorDetails::UnknownEventBoundaryUnsupported { event_type },
    ),
    DecodeError::IntegerOverflow { context } => (
      DecodeErrorKind::IntegerOverflow,
      DecodeErrorDetails::IntegerOverflow { context },
    ),
    DecodeError::TrailingBytes { context, remaining } => (
      DecodeErrorKind::TrailingBytes,
      DecodeErrorDetails::TrailingBytes { context, remaining },
    ),
    DecodeError::ValidationFailed(report) => (
      DecodeErrorKind::ValidationFailed,
      DecodeErrorDetails::ValidationFailed { report: *report },
    ),
  };

  DecodeFailure {
    kind,
    message,
    details,
  }
}

fn invalid_arg(message: impl Into<String>) -> NapiError {
  NapiError::new(Status::InvalidArg, message.into())
}

fn internal_error(message: impl Into<String>) -> NapiError {
  NapiError::new(Status::GenericFailure, message.into())
}
