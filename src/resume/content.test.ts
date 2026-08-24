import { describe, expect, test } from 'bun:test';
import { generalResume, parseResumeContent } from './content';

describe('parseResumeContent', () => {
  test('accepts the general resume', () => {
    expect(parseResumeContent(generalResume)).toEqual(generalResume);
  });

  test('defines the requested contact details', () => {
    expect(generalResume.identity).toEqual({
      name: 'Harrison Crosse',
      email: 'harrison@crosse.dev',
      phone: '703-472-7202',
      linkedin: {
        handle: 'hcrosse',
        url: 'https://linkedin.com/in/hcrosse',
      },
      github: {
        handle: 'hcrosse',
        url: 'https://github.com/hcrosse',
      },
      location: 'Arlington, VA, US',
    });
  });

  test.each([
    [
      'missing name',
      { ...generalResume, identity: { ...generalResume.identity, name: '' } },
    ],
    [
      'missing phone',
      { ...generalResume, identity: { ...generalResume.identity, phone: '' } },
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
