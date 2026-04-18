export type DiceResult =
  | { ok: true; expr: string; rolls: number[]; total: number }
  | { ok: false; error: string };

/**
 * 支持：
 * - /r d6
 * - /r 2d6
 * - /r 2d6+1
 * - /r 1d20-2
 */
export function parseDiceCommand(text: string): { isDice: boolean; result?: DiceResult } {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/r')) return { isDice: false };
  const expr = trimmed.replace(/^\/r\s*/i, '').trim();
  if (!expr) return { isDice: true, result: { ok: false, error: '缺少掷骰表达式，如 /r d6' } };

  const m = expr.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
  if (!m) return { isDice: true, result: { ok: false, error: '表达式不合法，示例：/r 2d6+1' } };

  const count = Math.max(1, Math.min(50, m[1] ? Number(m[1]) : 1));
  const sides = Math.max(2, Math.min(1000, Number(m[2])));
  const mod = m[3] ? Number(m[3]) : 0;

  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  const sum = rolls.reduce((a, b) => a + b, 0);
  return { isDice: true, result: { ok: true, expr, rolls, total: sum + mod } };
}

