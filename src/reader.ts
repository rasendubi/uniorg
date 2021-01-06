export class Reader {
  readonly #text: string;

  /// Current cursor position ignoring the narrowing boundaries.
  #offset = 0;

  /// Left boundary of the currently active narrowing.
  #left: number;
  /// Right boundary of the currently active narrowing (exclusive).
  #right: number;

  /// Array of currently active narrows.
  #narrows: Array<{
    prevLeft: number;
    prevRight: number;
    prevOffset: number;
  }> = [];

  public constructor(text: string) {
    this.#text = text;
    this.#left = 0;
    this.#right = text.length;
  }

  public advance(n: number | RegExpExecArray | null | string) {
    if (!n) {
      // do nothing
    } else if (typeof n === 'number') {
      this.#offset += n;
    } else if (typeof n === 'string') {
      if (this.rest().startsWith(n)) {
        this.#offset += n.length;
      } else {
        // TODO: raise?
      }
    } else {
      this.#offset += n.index + n[0].length;
    }
  }

  public match(regex: RegExp): RegExpExecArray | null {
    return regex.exec(this.rest());
  }

  public peek(n: number): string {
    return this.#text.substring(this.#offset, this.#offset + n);
  }

  public line(): string {
    const rest = this.rest();
    const endl = rest.indexOf('\n');
    return rest.substring(0, endl === -1 ? rest.length : endl + 1);
  }

  public rest() {
    return this.#text.substring(this.#offset, this.#right);
  }

  public substring(left: number, right: number): string {
    return this.#text.substring(left, right);
  }

  public eof(): boolean {
    return this.#offset >= this.#right;
  }

  public offset(): number {
    return this.#offset;
  }
  public endOffset(): number {
    return this.#right;
  }
  public resetOffset(offset: number) {
    this.#offset = offset;
  }

  /**
   * Narrows buffer to the region [`left`, `right`).
   *
   * If `preserveOffset` is false (default), also resets cursor to the
   * start of the narrowing region.
   */
  public narrow(left: number, right: number, preserveOffset = false) {
    this.#narrows.push({
      prevLeft: this.#left,
      prevRight: this.#right,
      prevOffset: this.#offset,
    });

    this.#left = left;
    this.#right = right;
    if (!preserveOffset) {
      this.#offset = left;
    }
  }
  /**
   * Cancels the previous narrowing operation.
   *
   * If `preserveOffset` is false (default), restores the cursor
   * position that was current when the narrowing was invoked.
   */
  public widen(preserveOffset = false) {
    const narrow = this.#narrows.pop();
    if (narrow) {
      this.#left = narrow.prevLeft;
      this.#right = narrow.prevRight;
      if (!preserveOffset) {
        this.#offset = narrow.prevOffset;
      }
    }
  }
}
