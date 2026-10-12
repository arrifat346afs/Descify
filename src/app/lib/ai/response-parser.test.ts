import { describe, it, expect } from 'vitest';
import {
  stripThinkBlocks,
  cleanAIResponse,
  repairJsonString,
  parseMetadataResponse,
} from './response-parser';

describe('stripThinkBlocks', () => {
  it('removes closed think blocks', () => {
    expect(stripThinkBlocks('<thinking>reasoning</thinking>answer')).toBe('answer');
    expect(stripThinkBlocks('<reason>r</reason>final')).toBe('final');
  });

  it('removes unclosed think blocks (model ran out of tokens)', () => {
    expect(stripThinkBlocks('<thinking>all the tokens')).toBe('');
  });

  it('keeps text without think blocks', () => {
    expect(stripThinkBlocks('{"title":"plain"}')).toBe('{"title":"plain"}');
  });
});

describe('cleanAIResponse', () => {
  it('strips markdown json fences', () => {
    expect(cleanAIResponse('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(cleanAIResponse('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
});

describe('repairJsonString', () => {
  it('removes trailing commas', () => {
    expect(repairJsonString('{"a":1,}')).toBe('{"a":1}');
    expect(repairJsonString('[1,2,]')).toBe('[1,2]');
  });

  it('converts single quotes when no double quotes exist', () => {
    expect(repairJsonString("{'a':'b'}")).toBe('{"a":"b"}');
  });

  it('leaves double-quoted JSON untouched', () => {
    expect(repairJsonString('{"a":"it\'s"}')).toBe('{"a":"it\'s"}');
  });
});

describe('parseMetadataResponse', () => {
  it('parses fenced JSON and applies keyword limits', () => {
    const result = parseMetadataResponse(
      '```json\n{"title":"Sunset over the ocean","description":"A golden sunset","keywords":"sky, sea, cloud, beach, wave"}\n```',
      'stop',
      { keywordLimit: 3 }
    );
    expect(result.title).toBe('Sunset over the ocean');
    // Title keywords are prepended, then the list is capped
    expect(result.keywords).toBe('sunset, ocean, sky');
  });

  it('throws on truncated responses before parsing', () => {
    expect(() => parseMetadataResponse('{"title":"Sunset ov', 'length')).toThrow(
      'AI response was truncated'
    );
  });

  it('throws on empty responses', () => {
    expect(() => parseMetadataResponse('   ', 'stop')).toThrow(
      'AI returned an empty response'
    );
  });

  it('throws on schema violations (title too short)', () => {
    expect(() =>
      parseMetadataResponse('{"title":"cat","description":"long enough","keywords":"a"}', 'stop')
    ).toThrow('AI returned invalid title (too short)');
  });

  it('throws on malformed JSON that cannot be repaired', () => {
    expect(() =>
      parseMetadataResponse('{"title":"Sunset over the ocean",', 'stop')
    ).toThrow();
  });
});
