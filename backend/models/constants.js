const PLAYER_TYPES = Object.freeze({
  NORMAL_USER: "normal_user",
  ADMIN: "admin",
  AGENT: "agent",
});

const GAME_STATES = Object.freeze([
  "waiting",
  "white_turn",
  "black_turn",
  "white_won",
  "black_won",
  "draw",
  "cancelled",
]);

const GAME_END_REASONS = Object.freeze([
  "checkmate",
  "stalemate",
  "repetition",
  "insufficient_material",
  "fifty_move_rule",
  "resignation",
  "timeout",
  "cancelled",
  "other_draw",
]);

module.exports = { PLAYER_TYPES, GAME_STATES, GAME_END_REASONS };
