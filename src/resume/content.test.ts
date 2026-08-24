import { describe, expect, test } from 'bun:test';
import { generalResume, parseResumeContent } from './content';

describe('parseResumeContent', () => {
  test('accepts the general resume', () => {
    expect(parseResumeContent(generalResume)).toEqual(generalResume);
  });

  test.each([
    [
      'missing name',
      { ...generalResume, identity: { ...generalResume.identity, name: '' } },
    ],
    ['empty employment', { ...generalResume, employment: [] }],
    [
      'empty highlight',
      {
        ...generalResume,
        employment: [{ ...generalResume.employment[0], highlights: [''] }],
      },
    ],
    ['empty tools', { ...generalResume, tools: [] }],
  ])('rejects %s', (_name, value) => {
    expect(() => parseResumeContent(value)).toThrow();
  });
});
