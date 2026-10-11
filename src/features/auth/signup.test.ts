import { describe, expect, it } from 'vitest';
import { clearPendingSignup, maskBirthDate, parseBirthDate, readPendingSignup, safeNext, savePendingSignup } from './signup';

describe('parseBirthDate', () => {
  it.each([
    ['17/05/2008', '2008-05-17'],
    ['29/02/2008', '2008-02-29'],
    [' 01/01/2000 ', '2000-01-01'],
  ])('lê %s', (input, expected) => {
    expect(parseBirthDate(input)).toBe(expected);
  });

  it.each(['', '17/05/08', '2008-05-17', '31/02/2008', '29/02/2007', '00/01/2000', '10/13/2000', 'aa/bb/cccc'])(
    'recusa %s',
    (input) => {
      expect(parseBirthDate(input)).toBeNull();
    },
  );
});

describe('maskBirthDate', () => {
  it.each([
    ['1', '1'],
    ['170', '17/0'],
    ['17052008', '17/05/2008'],
    ['17/05/2008', '17/05/2008'],
    ['170520089999', '17/05/2008'],
    ['ab', ''],
  ])('%s vira %s', (input, expected) => {
    expect(maskBirthDate(input)).toBe(expected);
  });
});

describe('safeNext', () => {
  it('aceita caminhos internos', () => {
    expect(safeNext('/temas/abc?x=1')).toBe('/temas/abc?x=1');
  });

  it.each([null, undefined, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'temas'])(
    'troca %s pelo destino padrão',
    (next) => {
      expect(safeNext(next)).toBe('/temas');
    },
  );
});

describe('cadastro pendente', () => {
  it('guarda, lê e limpa', () => {
    savePendingSignup({ birthDate: '2008-05-17', next: '/temas/abc' });
    expect(readPendingSignup()).toEqual({ birthDate: '2008-05-17', next: '/temas/abc' });

    clearPendingSignup();
    expect(readPendingSignup()).toEqual({});
  });

  it('não confia no destino guardado', () => {
    localStorage.setItem('redigiai.signup', JSON.stringify({ next: 'https://evil.test', birthDate: 42 }));

    expect(readPendingSignup()).toEqual({ birthDate: undefined, next: '/temas' });
    clearPendingSignup();
  });

  it('ignora conteúdo inválido', () => {
    localStorage.setItem('redigiai.signup', '{not json');

    expect(readPendingSignup()).toEqual({});
    clearPendingSignup();
  });
});
