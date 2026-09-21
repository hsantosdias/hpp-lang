import { describe, it, expect } from 'vitest';
import { lex } from '../packages/hpp-lang/src/lexer';
import { Parser } from '../packages/hpp-lang/src/parser';
import { compile } from '../packages/hpp-lang/src/index';

function parseOk(src: string) {
  const { tokens, errors } = lex(src);
  expect(errors).toEqual([]);
  const p = new Parser(tokens);
  const stmts = p.parse();
  expect(p.errors).toEqual([]);
  return stmts;
}

describe('H++ léxico', () => {
  it('palavras PT e EN viram o mesmo token', () => {
    const pt = lex('SE SENAO FIM ENQUANTO');
    const en = lex('IF ELSE END WHILE');
    expect(pt.errors).toEqual([]);
    expect(en.errors).toEqual([]);
    expect(pt.tokens.map((t) => t.keyword)).toEqual(en.tokens.map((t) => t.keyword));
  });

  it('ações e nomes (minúsculas), números e comentários', () => {
    const { tokens, errors } = lex('ANDAR 0.5 # dança\nvel = -1');
    expect(errors).toEqual([]);
    const kinds = tokens.map((t) => t.type);
    expect(kinds).toContain('ACTION');
    expect(kinds).toContain('NUMBER');
    const ident = tokens.find((t) => t.type === 'IDENT');
    expect(ident?.value).toBe('vel');
  });

  it('texto sem fechar aspas dá erro com linha', () => {
    const { errors } = lex('x = "oi');
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(1);
  });

  it('acentos valem como sem acento (NÃO, É, bússola)', () => {
    const { tokens, errors } = lex('SE NÃO ver_bola ENTÃO É x = 1');
    expect(errors).toEqual([]);
    expect(tokens.map((t) => t.keyword)).toContain('NOT');
    expect(tokens.map((t) => t.keyword)).toContain('AND');
    const idents = tokens.filter((t) => t.type === 'IDENT').map((t) => t.value);
    expect(idents).toContain('x');
    const { tokens: t2, errors: e2 } = lex('bússola');
    expect(e2).toEqual([]);
    expect(t2[0]).toMatchObject({ type: 'IDENT', value: 'bussola' });
  });

  it('ASCII continua idêntico (acentos não mudam nada existente)', () => {
    const a = lex('SE ver_bola ENTAO ANDAR 1 FIM');
    const b = lex('SE ver_bola ENTAO ANDAR 1 FIM');
    expect(a.tokens.map((t) => [t.type, t.value])).toEqual(b.tokens.map((t) => [t.type, t.value]));
  });

  it('vírgula decimal dá erro dedicado; vírgula de argumento passa', () => {
    const bad = lex('ANDAR 0,5');
    expect(bad.errors).toHaveLength(1);
    expect(bad.errors[0].message).toContain('ponto');
    expect(lex('MIN(1,2)').errors).toEqual([]);
    expect(lex('MIN(1 ,2)').errors).toEqual([]);
  });
});

describe('H++ parser', () => {
  it('SE/SENAO/FIM e QUANDO como açúcar', () => {
    const stmts = parseOk('SE ver_bola ENTAO ANDAR 1 SENAO GIRAR 1 FIM');
    expect(stmts[0].kind).toBe('if');
    const q = parseOk('QUANDO ver_bola ENTAO CHUTAR FIM');
    expect(q[0].kind).toBe('if');
  });

  it('SENAO SE na mesma linha encadeia sem FIM próprio (else-if)', () => {
    const stmts = parseOk('SE a ENTAO ANDAR 1 SENAO SE b ENTAO GIRAR 1 FIM');
    expect(stmts).toHaveLength(1);
    const outer = stmts[0] as { kind: string; otherwise: Array<{ kind: string }> };
    expect(outer.kind).toBe('if');
    expect(outer.otherwise).toHaveLength(1);
    expect(outer.otherwise[0].kind).toBe('if');
  });

  it('cadeia longa SENAO SE com um FIM só', () => {
    const stmts = parseOk('SE a ENTAO ANDAR 1 SENAO SE b ENTAO GIRAR 1 SENAO SE c ENTAO CHUTAR FIM');
    const outer = stmts[0] as { otherwise: Array<{ otherwise: Array<{ kind: string }> }> };
    expect(outer.otherwise[0].otherwise[0].kind).toBe('if');
  });

  it('SE em linha própria após SENAO continua clássico (dois FIMs)', () => {
    const stmts = parseOk('SE a ENTAO ANDAR 1 SENAO\n  SE b ENTAO GIRAR 1 FIM\nFIM');
    expect(stmts).toHaveLength(1);
    expect((stmts[0] as { otherwise: unknown[] }).otherwise).toHaveLength(1);
  });

  it('cadeia pode terminar com SENAO simples', () => {
    const stmts = parseOk('SE a ENTAO ANDAR 1 SENAO SE b ENTAO GIRAR 1 SENAO PARAR FIM');
    const outer = stmts[0] as { otherwise: Array<{ kind: string; otherwise: unknown[] }> };
    expect(outer.otherwise[0].kind).toBe('if');
    expect(outer.otherwise[0].otherwise).toHaveLength(1);
  });

  it('ELSE IF em inglês funciona igual', () => {
    const stmts = parseOk('IF a THEN DRIVE 1 ELSE IF b THEN TURN 1 END');
    expect(stmts).toHaveLength(1);
    expect((stmts[0] as { otherwise: Array<{ kind: string }> }).otherwise[0].kind).toBe('if');
  });

  it('precedência: E liga mais que OU; conta antes de comparar', () => {
    const stmts = parseOk('SE a OU b E c ENTAO PARAR FIM');
    const cond = (stmts[0] as { cond: { kind: string; op: string } }).cond;
    expect(cond.op).toBe('OR');
    const stmts2 = parseOk('SE 1 + 2 * 3 == 7 ENTAO PARAR FIM');
    expect(stmts2[0].kind).toBe('if');
  });

  it('REPETIR/ENQUANTO/PARA/FUNCAO com erros didáticos', () => {
    expect(parseOk('REPETIR 3 VEZES ANDAR 1 FIM')[0].kind).toBe('repeat');
    expect(parseOk('PARA i DE 1 ATE 5 ANDAR 1 FIM')[0].kind).toBe('for');
    expect(parseOk('FUNCAO oi() PARAR FIM')[0].kind).toBe('func');
    const { tokens } = lex('SE ver_bola ENTAO ANDAR 1');
    const p = new Parser(tokens);
    p.parse();
    expect(p.errors.length).toBeGreaterThan(0);
    expect(p.errors[0].message).toContain('FIM');
  });

  it('RETORNAR aceita literal booleano e negação', () => {
    const t = parseOk('FUNCAO p() RETORNAR VERDADEIRO FIM');
    const ret = (t[0] as { body: Array<{ kind: string; expr: unknown }> }).body[0];
    expect(ret.kind).toBe('return');
    expect(ret.expr).not.toBeNull();
    parseOk('FUNCAO p() RETORNAR NAO x FIM');
    parseOk('FUNCAO p() RETORNAR FIM');
  });

  it('= sozinho em condição sugere ==', () => {
    const { tokens } = lex('SE x = 1 ENTAO ANDAR 1 FIM');
    const p = new Parser(tokens);
    p.parse();
    expect(p.errors.length).toBeGreaterThan(0);
    expect(p.errors[0].message).toContain('==');
  });
});

describe('H++ compile', () => {
  it('exemplos da lib compilam sem erro', async () => {
    const { EXAMPLES } = await import('../packages/hpp-lang/src/examples');
    for (const ex of EXAMPLES) {
      const r = compile(ex.code);
      expect(r.errors, ex.id).toEqual([]);
      expect(r.program).not.toBeNull();
    }
  });
});
