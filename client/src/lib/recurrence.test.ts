import { describe, expect, it } from 'vitest';
import {
  describeFa,
  effectiveRule,
  nextOccurrence,
  occurrences,
  parseRuleSafe,
  ruleFromLegacy,
  shamsiWeekday,
  type RecurrenceRule,
} from './recurrence';

// ۷ سپتامبر ۲۰۲۶ دوشنبه است (مطابق تقویم: یکشنبه ۶ سپتامبر)
const MON_14 = '2026-09-07T14:00:00';

function mondayRule(over: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    freq: 'weekly',
    interval: 1,
    byWeekday: [2], // دوشنبه در ایندکس شمسی (۰=شنبه)
    time: '14:00',
    start: new Date(MON_14).toISOString(),
    missed: 'keep',
    end: { type: 'never' },
    ...over,
  };
}

describe('shamsiWeekday', () => {
  it('شنبه=۰ … جمعه=۶', () => {
    expect(shamsiWeekday(new Date(2026, 8, 5))).toBe(0); // شنبه ۵ سپتامبر
    expect(shamsiWeekday(new Date(2026, 8, 6))).toBe(1); // یکشنبه
    expect(shamsiWeekday(new Date(2026, 8, 7))).toBe(2); // دوشنبه
    expect(shamsiWeekday(new Date(2026, 8, 11))).toBe(6); // جمعه
  });
});

describe('weekly mondays 14:00', () => {
  it('سه دوشنبه متوالی ساعت ۱۴', () => {
    const occ = occurrences(
      mondayRule(),
      new Date('2026-09-07T00:00:00'),
      new Date('2026-09-21T23:59:59'),
    );
    expect(occ.map((d) => d.toISOString().slice(0, 13))).toEqual([
      new Date('2026-09-07T14:00:00').toISOString().slice(0, 13),
      new Date('2026-09-14T14:00:00').toISOString().slice(0, 13),
      new Date('2026-09-21T14:00:00').toISOString().slice(0, 13),
    ]);
    for (const o of occ) {
      expect(o.getHours()).toBe(14);
      expect(o.getMinutes()).toBe(0);
    }
  });

  it('وقوع بعدی بعد از تیک دوشنبه اول', () => {
    const rule = mondayRule();
    const next = nextOccurrence(rule, new Date('2026-09-07T14:00:00'), {
      afterCompleted: new Date('2026-09-07T14:00:00'),
    });
    expect(next?.getDate()).toBe(14);
    expect(next?.getHours()).toBe(14);
  });
});

describe('weekly multi-day interval', () => {
  it('شنبه و چهارشنبه هر هفته (قانون از دوشنبه ۷ شروع می‌شود)', () => {
    const occ = occurrences(
      mondayRule({ byWeekday: [0, 4], time: '09:30' }),
      new Date('2026-09-05T00:00:00'),
      new Date('2026-09-12T23:59:59'),
    );
    // شنبه ۵ قبل از شروع قانون است و شمرده نمی‌شود؛ چهارشنبه ۹ و شنبه ۱۲
    expect(occ.map((d) => d.getDate())).toEqual([9, 12]);
  });

  it('هر ۲ هفته دوشنبه', () => {
    const occ = occurrences(
      mondayRule({ interval: 2 }),
      new Date('2026-09-07T00:00:00'),
      new Date('2026-09-28T23:59:59'),
    );
    expect(occ.map((d) => d.getDate())).toEqual([7, 21]);
  });
});

describe('daily', () => {
  it('هر ۲ روز', () => {
    const occ = occurrences(
      {
        freq: 'daily',
        interval: 2,
        start: new Date('2026-09-01T08:00:00').toISOString(),
        missed: 'keep',
      },
      new Date('2026-09-01T00:00:00'),
      new Date('2026-09-07T23:59:59'),
    );
    expect(occ.map((d) => d.getDate())).toEqual([1, 3, 5, 7]);
  });
});

describe('monthly', () => {
  it('روز ۳۱ در ماه کوتاه به آخرین روز می‌چسبد', () => {
    const occ = occurrences(
      {
        freq: 'monthly',
        interval: 1,
        start: new Date('2026-01-31T10:00:00').toISOString(),
        missed: 'keep',
      },
      new Date('2026-01-01T00:00:00'),
      new Date('2026-03-31T23:59:59'),
    );
    // ژانویه ۳۱، فوریه ۲۸ (۲۰۲۶ کبیسه نیست)، مارس ۳۱
    expect(occ.map((d) => `${d.getMonth() + 1}/${d.getDate()}`)).toEqual([
      '1/31',
      '2/28',
      '3/31',
    ]);
  });

  it('دومین دوشنبه هر ماه', () => {
    const occ = occurrences(
      {
        freq: 'monthly',
        interval: 1,
        monthlyMode: 'nthWeekday',
        start: new Date('2026-09-14T10:00:00').toISOString(), // دومین دوشنبه سپتامبر
        missed: 'keep',
      },
      new Date('2026-09-01T00:00:00'),
      new Date('2026-11-30T23:59:59'),
    );
    // ۱۴ سپتامبر، ۱۲ اکتبر، ۹ نوامبر
    expect(occ.map((d) => `${d.getMonth() + 1}/${d.getDate()}`)).toEqual([
      '9/14',
      '10/12',
      '11/9',
    ]);
  });
});

describe('end conditions', () => {
  it('پایان بعد از ۳ بار', () => {
    const occ = occurrences(
      mondayRule({ end: { type: 'after', count: 3 } }),
      new Date('2026-09-01T00:00:00'),
      new Date('2026-12-31T23:59:59'),
    );
    expect(occ.map((d) => d.getDate())).toEqual([7, 14, 21]);
  });

  it('پایان تا تاریخ', () => {
    const occ = occurrences(
      mondayRule({ end: { type: 'onDate', date: new Date('2026-09-14T23:59:59').toISOString() } }),
      new Date('2026-09-01T00:00:00'),
      new Date('2026-12-31T23:59:59'),
    );
    expect(occ.map((d) => d.getDate())).toEqual([7, 14]);
  });
});

describe('describeFa', () => {
  it('هر دوشنبه ساعت ۱۴:۰۰', () => {
    const s = describeFa(mondayRule());
    expect(s).toContain('دوشنبه');
    expect(s).toContain('۱۴:۰۰');
  });

  it('پایان و معوق در توضیح می‌آید', () => {
    const s = describeFa(mondayRule({ end: { type: 'after', count: 5 }, missed: 'nextOnly' }));
    expect(s).toContain('۵ بار');
    expect(s).not.toContain('معوق');
  });
});

describe('compat', () => {
  it('parseRuleSafe قانون خراب را رد می‌کند', () => {
    expect(parseRuleSafe('not-json')).toBeNull();
    expect(parseRuleSafe('{}')).toBeNull();
    expect(parseRuleSafe({ freq: 'minutely', interval: 1, start: 'x', missed: 'keep' })).toBeNull();
  });

  it('ruleFromLegacy', () => {
    expect(ruleFromLegacy('none', null)).toBeNull();
    const r = ruleFromLegacy('weekly', '2026-09-07T14:00:00.000Z');
    expect(r?.freq).toBe('weekly');
    expect(effectiveRule({ recurrence: 'daily', dueDate: null })?.freq).toBe('daily');
    expect(
      effectiveRule({ recurrenceRule: mondayRule(), recurrence: 'daily' })?.byWeekday,
    ).toEqual([2]);
  });
});
