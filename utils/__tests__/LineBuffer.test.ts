import { LineBuffer } from '../LineBuffer';

describe('LineBuffer', () => {
  it('reassembles a line split across chunks', () => {
    const buffer = new LineBuffer();
    expect(buffer.append('You are hu')).toEqual([]);
    expect(buffer.append('ngry.\n')).toEqual(['You are hungry.']);
  });
});
