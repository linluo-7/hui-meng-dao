import type { RuleSet } from '@/src/models/types';

type ParseOk = { ok: true; value: RuleSet };
type ParseErr = { ok: false; error: string };

export function parseRuleSet(json: string | undefined | null): ParseOk | ParseErr {
  if (!json || typeof json !== 'string') {
    return { ok: false, error: '规则配置为空' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '未知错误';
    return { ok: false, error: `JSON 解析失败：${msg}` };
  }

  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: '规则配置必须是对象' };
  }

  const obj = raw as any;
  const dice = obj.dice ?? obj; // 兼容 M2 简单 `{ dice: 'd100' }` 或 `{ system: 'd100' }`

  const system: string | undefined = dice.system ?? obj.system ?? obj.dice;
  const allowed = ['d100', 'd20', 'rd6', 'custom'];
  if (!system || !allowed.includes(system)) {
    return { ok: false, error: '缺少或不支持的掷骰 system（期望 d100/d20/rd6/custom）' };
  }

  const ruleSet: RuleSet = {
    dice: {
      system: system as RuleSet['dice']['system'],
      expression: typeof dice.expression === 'string' ? dice.expression : undefined,
    },
  };

  if (typeof obj.cooldownSeconds === 'number') {
    ruleSet.cooldownSeconds = obj.cooldownSeconds;
  } else if (typeof obj.cooldown === 'number') {
    // 兼容旧字段名
    ruleSet.cooldownSeconds = obj.cooldown;
  }

  if (typeof obj.allowPvp === 'boolean') {
    ruleSet.allowPvp = obj.allowPvp;
  }
  if (typeof obj.autoJudge === 'boolean') {
    ruleSet.autoJudge = obj.autoJudge;
  }

  return { ok: true, value: ruleSet };
}

export function formatRuleSetHumanReadable(ruleSet: RuleSet): string {
  const diceText =
    ruleSet.dice.system === 'custom'
      ? `自定义（${ruleSet.dice.expression || '表达式未填写'}）`
      : ruleSet.dice.system;
  const cd =
    typeof ruleSet.cooldownSeconds === 'number'
      ? `${ruleSet.cooldownSeconds} 秒`
      : '未设置';
  const pvp = ruleSet.allowPvp ? '开启' : '关闭';
  const auto = ruleSet.autoJudge ? '开启' : '关闭';
  return `掷骰：${diceText}，冷却：${cd}，PVP：${pvp}，自动判定：${auto}`;
}

