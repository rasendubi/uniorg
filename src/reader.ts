export class Reader {
  #text: string;
  #offset = 0;

  public constructor(text: string) {
    this.#text = text;
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

  public eof(): boolean {
    return this.#offset >= this.#text.length;
  }

  public offset(): number {
    return this.#offset;
  }
  public resetOffset(offset: number) {
    this.#offset = offset;
  }

  public text(): string {
    return this.rest();
  }

  #narrows: Array<{ left: number; right: number; text: string }> = [];
  public narrow(left: number, right: number) {
    this.#narrows.push({ left, right, text: this.#text });

    this.#text = this.#text.substring(left, right);
    this.#offset -= left;
  }
  public widen() {
    const narrow = this.#narrows.pop();
    if (narrow) {
      this.#text = narrow.text;
      this.#offset += narrow.left;
    }
  }

  private rest() {
    return this.#text.substring(this.#offset);
  }
}
