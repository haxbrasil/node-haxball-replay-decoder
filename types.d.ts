export type BytesLike = Buffer | Uint8Array

export type ValidationProfile = 'strict' | 'structural'

export interface DecodeOptions {
  validationProfile?: ValidationProfile
  allowUnknownEventTypes?: boolean
}

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  code: string
  severity: ValidationSeverity
  path: string
  message: string
}

export interface ValidationReport {
  profile: ValidationProfile
  issues: ValidationIssue[]
}

export type OperationType =
  | 'sendAnnouncement'
  | 'sendChatIndicator'
  | 'checkConsistency'
  | 'sendInput'
  | 'sendChat'
  | 'joinRoom'
  | 'kickBanPlayer'
  | 'startGame'
  | 'stopGame'
  | 'pauseResumeGame'
  | 'setGamePlayLimit'
  | 'setStadium'
  | 'setPlayerTeam'
  | 'setTeamsLock'
  | 'setPlayerAdmin'
  | 'autoTeams'
  | 'setPlayerSync'
  | 'ping'
  | 'setAvatar'
  | 'setTeamColors'
  | 'reorderPlayers'
  | 'setKickRateLimit'
  | 'setHeadlessAvatar'
  | 'setDiscProperties'
  | 'customEvent'
  | 'binaryCustomEvent'
  | 'setPlayerIdentity'

export type BackgroundType = 'none' | 'grass' | 'hockey' | { unknown: number }

export type CameraFollow = 'none' | 'player' | { unknown: number }

export type GamePlayState = 'beforeKickOff' | 'playing' | 'afterGoal' | 'ending' | { unknown: number }

export interface Point {
  x: number
  y: number
}

export interface Vertex {
  pos: Point
  bCoef: number
  cMask: number
  cGroup: number
}

export interface Segment {
  flags: number
  v0: number
  v1: number
  bias: number
  curve: number
  color: number
  vis: boolean
  bCoef: number
  cMask: number
  cGroup: number
}

export interface Plane {
  normal: Point
  dist: number
  bCoef: number
  cMask: number
  cGroup: number
}

export interface Goal {
  p0: Point
  p1: Point
  teamId: number
}

export interface Disc {
  pos: Point
  speed: Point
  gravity: Point
  radius: number
  bCoef: number
  invMass: number
  damping: number
  color: number
  cMask: number
  cGroup: number
}

export interface Joint {
  d0: number
  d1: number
  minLength: number
  maxLength: number
  strength: number
  color: number
}

export interface PlayerPhysics {
  bCoef: number
  invMass: number
  damping: number
  acceleration: number
  kickingAcceleration: number
  kickingDamping: number
  kickStrength: number
  gravity: Point
  cGroup: number
  radius: number
  kickback: number
}

export interface TeamColors {
  angle: number
  text: number
  inner: number[]
}

export interface Stadium {
  defaultStadiumId: number
  name: string | null
  backgroundType: BackgroundType | null
  backgroundWidth: number | null
  backgroundHeight: number | null
  backgroundKickoffRadius: number | null
  backgroundCornerRadius: number | null
  backgroundGoalLine: number | null
  backgroundColor: number | null
  width: number | null
  height: number | null
  spawnDistance: number | null
  playerPhysics: PlayerPhysics | null
  maxViewWidth: number | null
  cameraFollow: CameraFollow | null
  canBeStored: boolean | null
  fullKickoffReset: boolean | null
  vertices: Vertex[]
  segments: Segment[]
  planes: Plane[]
  goals: Goal[]
  discs: Disc[]
  joints: Joint[]
  redSpawnPoints: Point[]
  blueSpawnPoints: Point[]
}

export interface Player {
  isAdmin: boolean
  avatarNumber: number
  avatar: string | null
  headlessAvatar: string | null
  sync: boolean
  flag: string | null
  metadata: number
  name: string | null
  input: number
  id: number
  isKicking: boolean
  kickRateMaxTickCounter: number
  kickRateMinTickCounter: number
  teamId: number
  discIndex: number
}

export interface GameState {
  discs: Disc[]
  goalTickCounter: number
  state: GamePlayState
  redScore: number
  blueScore: number
  timeElapsed: number
  pauseGameTickCounter: number
  goalConcedingTeam: number
}

export interface RoomState {
  name: string | null
  teamsLocked: boolean
  scoreLimit: number
  timeLimit: number
  kickRateMax: number
  kickRateRate: number
  kickRateMin: number
  stadium: Stadium
  gameState: GameState | null
  players: Player[]
  redTeamColors: TeamColors
  blueTeamColors: TeamColors
}

export interface GoalMarker {
  frameNo: number
  teamId: number
}

export interface SendAnnouncementEvent {
  msg: string
  color: number
  style: number
  sound: number
}

export interface SendChatIndicatorEvent {
  value: number
}

export interface CheckConsistencyEvent {
  data: number[]
}

export interface SendInputEvent {
  input: number
}

export interface SendChatEvent {
  text: string
}

export interface JoinRoomEvent {
  playerId: number
  name: string | null
  flag: string | null
  avatar: string | null
}

export interface KickBanPlayerEvent {
  playerId: number
  reason: string | null
  ban: boolean
}

export type StartGameEvent = Record<string, never>
export type StopGameEvent = Record<string, never>

export interface PauseResumeGameEvent {
  paused: boolean
}

export interface SetGamePlayLimitEvent {
  limitType: number
  newValue: number
}

export interface SetStadiumEvent {
  stadium: Stadium
}

export interface SetPlayerTeamEvent {
  playerId: number
  teamId: number
}

export interface SetTeamsLockEvent {
  newValue: boolean
}

export interface SetPlayerAdminEvent {
  playerId: number
  value: boolean
}

export type AutoTeamsEvent = Record<string, never>

export interface SetPlayerSyncEvent {
  value: boolean
}

export interface PingEvent {
  pings: number[]
}

export interface SetAvatarEvent {
  value: string | null
}

export interface SetTeamColorsEvent {
  teamId: number
  colors: TeamColors
}

export interface ReorderPlayersEvent {
  moveToTop: boolean
  playerIdList: number[]
}

export interface SetKickRateLimitEvent {
  min: number
  rate: number
  burst: number
}

export interface SetHeadlessAvatarEvent {
  value: string | null
  playerId: number
}

export type DiscFloatProperties = [
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
]

export type DiscIntegerProperties = [number | null, number | null, number | null]

export interface SetDiscPropertiesEvent {
  id: number
  isPlayer: boolean
  flags: number
  data1: DiscFloatProperties
  data2: DiscIntegerProperties
}

export interface CustomEvent {
  eventType: number
  data: unknown
}

export interface BinaryCustomEvent {
  eventType: number
  data: number[]
}

export interface SetPlayerIdentityEvent {
  id: number
  data: unknown
}

export interface UnknownEvent {
  eventType: number
  rawPayload: number[]
}

export type EventPayload =
  | { kind: 'sendAnnouncement'; value: SendAnnouncementEvent }
  | { kind: 'sendChatIndicator'; value: SendChatIndicatorEvent }
  | { kind: 'checkConsistency'; value: CheckConsistencyEvent }
  | { kind: 'sendInput'; value: SendInputEvent }
  | { kind: 'sendChat'; value: SendChatEvent }
  | { kind: 'joinRoom'; value: JoinRoomEvent }
  | { kind: 'kickBanPlayer'; value: KickBanPlayerEvent }
  | { kind: 'startGame'; value: StartGameEvent }
  | { kind: 'stopGame'; value: StopGameEvent }
  | { kind: 'pauseResumeGame'; value: PauseResumeGameEvent }
  | { kind: 'setGamePlayLimit'; value: SetGamePlayLimitEvent }
  | { kind: 'setStadium'; value: SetStadiumEvent }
  | { kind: 'setPlayerTeam'; value: SetPlayerTeamEvent }
  | { kind: 'setTeamsLock'; value: SetTeamsLockEvent }
  | { kind: 'setPlayerAdmin'; value: SetPlayerAdminEvent }
  | { kind: 'autoTeams'; value: AutoTeamsEvent }
  | { kind: 'setPlayerSync'; value: SetPlayerSyncEvent }
  | { kind: 'ping'; value: PingEvent }
  | { kind: 'setAvatar'; value: SetAvatarEvent }
  | { kind: 'setTeamColors'; value: SetTeamColorsEvent }
  | { kind: 'reorderPlayers'; value: ReorderPlayersEvent }
  | { kind: 'setKickRateLimit'; value: SetKickRateLimitEvent }
  | { kind: 'setHeadlessAvatar'; value: SetHeadlessAvatarEvent }
  | { kind: 'setDiscProperties'; value: SetDiscPropertiesEvent }
  | { kind: 'customEvent'; value: CustomEvent }
  | { kind: 'binaryCustomEvent'; value: BinaryCustomEvent }
  | { kind: 'setPlayerIdentity'; value: SetPlayerIdentityEvent }
  | { kind: 'unknown'; value: UnknownEvent }

export interface ReplayEvent {
  frameNo: number
  byId: number
  payload: EventPayload
}

export interface ReplayData {
  roomData: RoomState
  events: ReplayEvent[]
  goalMarkers: GoalMarker[]
  totalFrames: number
  version: number
}

export type DecodeErrorKind =
  | 'invalidMagic'
  | 'unexpectedEof'
  | 'invalidVarInt'
  | 'invalidUtf8'
  | 'invalidJson'
  | 'compression'
  | 'incompleteCompression'
  | 'trailingCompressedData'
  | 'unsupportedReplayVersion'
  | 'unsupportedEventType'
  | 'unknownEventBoundaryUnsupported'
  | 'integerOverflow'
  | 'trailingBytes'
  | 'validationFailed'

export type DecodeErrorDetails =
  | { kind: 'invalidMagic'; found: number[] }
  | { kind: 'unexpectedEof'; context: string }
  | { kind: 'invalidVarInt'; context: string }
  | { kind: 'invalidUtf8'; context: string; source: string }
  | { kind: 'invalidJson'; context: string; source: string }
  | { kind: 'compression'; context: string; source: string }
  | { kind: 'incompleteCompression'; context: string }
  | { kind: 'trailingCompressedData'; context: string }
  | { kind: 'unsupportedReplayVersion'; version: number }
  | { kind: 'unsupportedEventType'; eventType: number }
  | { kind: 'unknownEventBoundaryUnsupported'; eventType: number }
  | { kind: 'integerOverflow'; context: string }
  | { kind: 'trailingBytes'; context: string; remaining: number }
  | { kind: 'validationFailed'; report: ValidationReport }

export interface DecodeFailure {
  kind: DecodeErrorKind
  message: string
  details: DecodeErrorDetails
}

export type DecodeResult = { ok: true; data: ReplayData } | { ok: false; error: DecodeFailure }
