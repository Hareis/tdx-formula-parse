import { Lexer } from '../lexer';
import { Token, TokenType } from '../token';

describe('Lexer', () => {
  test('should tokenize simple expression', () => {
    const lexer = new Lexer('MA5: MA(C, 5)');
    
    const tokens: Token[] = [];
    let token = lexer.nextToken();
    
    while (token.tokenType !== TokenType.Eof) {
      tokens.push(token);
      token = lexer.nextToken();
    }
    
    expect(tokens).toHaveLength(8);
    expect(tokens[0].tokenType).toBe(TokenType.Identifier);
    expect(tokens[0].lexeme).toBe('MA5');
    expect(tokens[1].tokenType).toBe(TokenType.Colon);
    expect(tokens[2].tokenType).toBe(TokenType.Identifier);
    expect(tokens[2].lexeme).toBe('MA');
    expect(tokens[3].tokenType).toBe(TokenType.LParen);
    expect(tokens[4].tokenType).toBe(TokenType.Identifier);
    expect(tokens[4].lexeme).toBe('C');
    expect(tokens[5].tokenType).toBe(TokenType.Comma);
    expect(tokens[6].tokenType).toBe(TokenType.Number);
    expect(tokens[6].lexeme).toBe('5');
    expect(tokens[7].tokenType).toBe(TokenType.RParen);
  });

  test('should handle assignment operator', () => {
    const lexer = new Lexer('VAR := 10')
    
    const tokens: any[] = [];
    let token = lexer.nextToken();
    
    while (token.tokenType !== TokenType.Eof) {
      tokens.push(token);
      token = lexer.nextToken();
    }
    
    expect(tokens[1].tokenType).toBe(TokenType.ColonAssign);
    expect(tokens[1].lexeme).toBe(':=');
  });

  test('should handle comparison operators', () => {
    const lexer = new Lexer('A > B AND C < D');
    
    const tokens: any[] = [];
    let token = lexer.nextToken();
    
    while (token.tokenType !== TokenType.Eof) {
      tokens.push(token);
      token = lexer.nextToken();
    }
    
    expect(tokens[1].tokenType).toBe(TokenType.Gt);
    expect(tokens[3].tokenType).toBe(TokenType.And);
    expect(tokens[5].tokenType).toBe(TokenType.Lt);
  });

  test('should handle numbers with decimals', () => {
    const lexer = new Lexer('PRICE: 12.34')
    
    const tokens: any[] = [];
    let token = lexer.nextToken();
    
    while (token.tokenType !== TokenType.Eof) {
      tokens.push(token);
      token = lexer.nextToken();
    }
    
    expect(tokens[2].tokenType).toBe(TokenType.Number);
    expect(tokens[2].lexeme).toBe('12.34');
  });

  test('should skip comments', () => {
    const lexer = new Lexer('{ 这是一个注释 } PRICE: 10')
    
    const tokens: any[] = [];
    let token = lexer.nextToken();
    
    while (token.tokenType !== TokenType.Eof) {
      tokens.push(token);
      token = lexer.nextToken();
    }
    
    expect(tokens[0].tokenType).toBe(TokenType.Identifier);
    expect(tokens[0].lexeme).toBe('PRICE');
    expect(tokens[1].tokenType).toBe(TokenType.Colon);
  });

  test('should handle keywords', () => {
    const lexer = new Lexer('IF AND OR NOT');
    
    const tokens: any[] = [];
    let token = lexer.nextToken();
    
    while (token.tokenType !== TokenType.Eof) {
      tokens.push(token);
      token = lexer.nextToken();
    }
    
    expect(tokens[0].tokenType).toBe(TokenType.If);
    expect(tokens[1].tokenType).toBe(TokenType.And);
    expect(tokens[2].tokenType).toBe(TokenType.Or);
    expect(tokens[3].tokenType).toBe(TokenType.Not);
  });
});
