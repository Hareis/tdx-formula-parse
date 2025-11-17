// 词法分析器，对应Rust的lexer.rs
import { Token, TokenType, createToken, lookupKeyword } from './token';

export class Lexer {
  private input: string;
  private position: number;
  private line: number;
  private column: number;

  constructor(input: string) {
    this.input = input;
    this.position = 0;
    this.line = 1;
    this.column = 1;
  }

  // 获取下一个Token
  nextToken(): Token {
    this.skipWhitespace();

    if (this.isAtEnd()) {
      return createToken(TokenType.Eof, '', this.line, this.column);
    }

    const char = this.peek();

    // 单字符Token
    switch (char) {
      case '(':
        return this.consumeCharToken(TokenType.LParen);
      case ')':
        return this.consumeCharToken(TokenType.RParen);
      case ',':
        return this.consumeCharToken(TokenType.Comma);
      case ';':
        return this.consumeCharToken(TokenType.Semicolon);
      case '+':
        return this.consumeCharToken(TokenType.Plus);
      case '-':
        return this.consumeCharToken(TokenType.Minus);
      case '*':
        return this.consumeCharToken(TokenType.Star);
      case '/':
        return this.consumeCharToken(TokenType.Slash);
      case ':':
        return this.handleColon();
      case '>':
        return this.handleGreater();
      case '<':
        return this.handleLess();
      case '=':
        return this.handleEqual();
      case '"':
        return this.readString();
      case '\n':
        return this.handleNewline();
      case '{':
        this.skipComment();
        return this.nextToken();
    }

    // 数字
    if (this.isDigit(char)) {
      return this.readNumber();
    }

    // 标识符或关键词
    if (this.isAlpha(char)) {
      return this.readIdentifier();
    }

    // 非法字符
    return createToken(TokenType.Illegal, char, this.line, this.column);
  }

  // 跳过空白字符（但不跳过换行符）
  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  // 跳过注释（以{开始，以}结束）
  private skipComment(): void {
    while (!this.isAtEnd() && this.peek() !== '}') {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      this.advance();
    }
    if (!this.isAtEnd()) {
      this.advance(); // 跳过 }
    }
  }

  // 处理冒号（可能为:或:=）
  private handleColon(): Token {
    if (this.peekNext() === '=') {
      const startColumn = this.column;
      const lexeme = this.advance() + this.advance();
      return createToken(TokenType.ColonAssign, lexeme, this.line, startColumn);
    }
    return this.consumeCharToken(TokenType.Colon);
  }

  // 处理大于号（可能为>或>=）
  private handleGreater(): Token {
    if (this.peekNext() === '=') {
      const startColumn = this.column;
      const lexeme = this.advance() + this.advance();
      return createToken(TokenType.GtEq, lexeme, this.line, startColumn);
    }
    return this.consumeCharToken(TokenType.Gt);
  }

  // 处理小于号（可能为<或<=或<>）
  private handleLess(): Token {
    if (this.peekNext() === '=') {
      const startColumn = this.column;
      const lexeme = this.advance() + this.advance();
      return createToken(TokenType.LtEq, lexeme, this.line, startColumn);
    }
    if (this.peekNext() === '>') {
      const startColumn = this.column;
      const lexeme = this.advance() + this.advance();
      return createToken(TokenType.NotEq, lexeme, this.line, startColumn);
    }
    return this.consumeCharToken(TokenType.Lt);
  }

  // 处理等号（可能为=或==）
  private handleEqual(): Token {
    if (this.peekNext() === '=') {
      const startColumn = this.column;
      const lexeme = this.advance() + this.advance();
      return createToken(TokenType.EqEq, lexeme, this.line, startColumn);
    }
    return this.consumeCharToken(TokenType.EqEq);
  }

  // 处理换行符
  private handleNewline(): Token {
    const startColumn = this.column;
    const char = this.advance();
    this.line++;
    this.column = 1;
    return createToken(TokenType.Newline, char, this.line, startColumn);
  }

  // 读取数字
  private readNumber(): Token {
    const startColumn = this.column;
    let lexeme = '';

    // 整数部分
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      lexeme += this.advance();
    }

    // 小数部分
    if (!this.isAtEnd() && this.peek() === '.') {
      lexeme += this.advance(); // 小数点
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        lexeme += this.advance();
      }
    }

    return createToken(TokenType.Number, lexeme, this.line, startColumn);
  }

  // 读取标识符
  private readIdentifier(): Token {
    const startColumn = this.column;
    let lexeme = '';

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      lexeme += this.advance();
    }

    const tokenType = lookupKeyword(lexeme);
    return createToken(tokenType, lexeme, this.line, startColumn);
  }

  // 读取字符串
  private readString(): Token {
    const startColumn = this.column;
    let lexeme = '';
    
    this.advance(); // 跳过开头引号
    
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      lexeme += this.advance();
    }
    
    if (this.isAtEnd()) {
      return createToken(TokenType.Illegal, lexeme, this.line, startColumn);
    }
    
    this.advance(); // 跳过结尾引号
    return createToken(TokenType.String, lexeme, this.line, startColumn);
  }

  // 消耗单个字符的Token
  private consumeCharToken(tokenType: TokenType): Token {
    const startColumn = this.column;
    const char = this.advance();
    return createToken(tokenType, char, this.line, startColumn);
  }

  // 辅助方法
  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1];
  }

  private advance(): string {
    if (this.isAtEnd()) return '\0';
    const char = this.input[this.position];
    this.position++;
    this.column++;
    return char;
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }


}
