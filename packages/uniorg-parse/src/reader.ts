import { VFile } from 'vfile';
import vfileLocation, { Location } from 'vfile-location';

export class Reader {
  readonly #text: string;
  readonly #vfile: VFile;
  readonly #location: Location;

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

  public constructor(vfile: VFile) {
    this.#text = vfile.toString();
    this.#left = 0;
    this.#right = this.#text.length;
    this.#vfile = vfile;
    this.#location = vfileLocation(vfile);
  }

  public message(reason: string, offset?: number, ruleId?: string) {
    const point =
      offset !== undefined ? this.#location.toPoint(offset) : undefined;
    this.#vfile.message(reason, point, ruleId);
  }

  public advance<
    T extends string | number | RegExpExecArray | null | undefined
  >(n: T): T {
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
    return n;
  }

  /**
   * Move cursor backwards.
   */
  public backoff(n: number) {
    this.#offset = Math.max(this.#left, this.#offset - n);
  }

  public match(regex: RegExp): RegExpExecArray | null {
    return regex.exec(this.rest());
  }

  public lookingAt(regex: RegExp): RegExpExecArray | null {
    const m = this.match(regex);
    return m?.index === 0 ? m : null;
  }

  public forceMatch(regex: RegExp): RegExpExecArray {
    const m = this.match(regex);
    if (!m) {
      throw new Error(
        `match error: ${regex} against ${JSON.stringify(this.rest())}`
      );
    }
    return m;
  }

  public forceLookingAt(regex: RegExp): RegExpExecArray {
    const m = this.lookingAt(regex);
    if (!m) {
      throw new Error(
        `match (lookingAt) error: ${regex} against ${JSON.stringify(
          this.rest()
        )}`
      );
    }
    return m;
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

  /**
   * Returns string at [left, right).
   *
   * Ignores narrowing.
   */
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
