import { parseSpeedwalk } from '../../utils/CommandUtils';

describe('parseSpeedwalk', () => {
  it('parses normal speedwalk string', () => {
    expect(parseSpeedwalk('2ne,3e,2n,e')).toEqual([
      'northeast',
      'northeast',
      'east',
      'east',
      'east',
      'north',
      'north',
      'east',
    ]);
  });

  it('parses speedwalk string backwards', () => {
    expect(parseSpeedwalk('2ne,3e,2n,e', true)).toEqual([
      'west',
      'south',
      'south',
      'west',
      'west',
      'west',
      'southwest',
      'southwest',
    ]);
  });

  it('handles single directions and custom commands', () => {
    expect(parseSpeedwalk('2d')).toEqual(['down', 'down']);
    expect(parseSpeedwalk('2d', true)).toEqual(['up', 'up']);
  });

  it('handles empty string', () => {
    expect(parseSpeedwalk('')).toEqual([]);
    expect(parseSpeedwalk('', true)).toEqual([]);
  });
});
