// utils/LineBuffer.ts
// Buffers a text stream and yields complete lines (newline-delimited).

export class LineBuffer {
  private buffer = '';

  append(chunk: string): string[] {
    if (!chunk) return [];
    this.buffer += chunk;
    return this.drainCompleteLines();
  }

  hasPending(): boolean {
    return this.buffer.length > 0;
  }

  flush(): string | null {
    if (!this.buffer) return null;
    const line = this.buffer;
    this.buffer = '';
    return line;
  }

  reset(): void {
    this.buffer = '';
  }

  private drainCompleteLines(): string[] {
    const lines: string[] = [];
    let index = this.findNewlineIndex(this.buffer);

    while (index !== -1) {
      lines.push(this.buffer.slice(0, index));
      const skip = this.newlineLengthAt(this.buffer, index);
      this.buffer = this.buffer.slice(index + skip);
      index = this.findNewlineIndex(this.buffer);
    }

    return lines;
  }

  private findNewlineIndex(text: string): number {
    const lf = text.indexOf('\n');
    const cr = text.indexOf('\r');
    if (lf === -1) return cr;
    if (cr === -1) return lf;
    return Math.min(lf, cr);
  }

  private newlineLengthAt(text: string, index: number): number {
    if (text[index] === '\r' && text[index + 1] === '\n') return 2;
    return 1;
  }
}
