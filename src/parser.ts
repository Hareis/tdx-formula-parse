// 语法分析器，对应Rust的parser.rs
import { Token, TokenType } from './token';
import {
  Expr,
  Statement,
  Formula,
  createLiteralExpr,
  createVariableExpr,
  createUnaryOpExpr,
  createBinaryOpExpr,
  createFunctionCallExpr,
  createGroupedExpr,
  createAssignmentStatement,
  createOutputStatement,
  createFormula,
  UnaryOperator,
  BinaryOperator,
} from './ast';
import { Lexer } from './lexer';

interface Peekable<T> {
  next(): IteratorResult<T>;
  peek(): IteratorResult<T>;
}

class LexerIterator implements Peekable<Token> {
  private lexer: () => Token;
  private nextToken: Token | null = null;

  constructor(lexer: () => Token) {
    this.lexer = lexer;
  }

  next(): IteratorResult<Token> {
    if (this.nextToken !== null) {
      const token = this.nextToken;
      this.nextToken = null;
      return { value: token, done: false };
    }
    const token = this.lexer();
    if (token.tokenType === TokenType.Eof) {
      return { value: undefined, done: true };
    }
    return { value: token, done: false };
  }

  peek(): IteratorResult<Token> {
    if (this.nextToken === null) {
      this.nextToken = this.lexer();
    }
    if (this.nextToken.tokenType === TokenType.Eof) {
      return { value: undefined, done: true };
    }
    return { value: this.nextToken, done: false };
  }
}

export class Parser {
  private lexer: Peekable<Token>;
  private currentToken: Token | null = null;

  constructor(lexerFunction: () => Token) {
    this.lexer = new LexerIterator(lexerFunction);
    this.advance();
  }

  // 解析整个公式
  parseFormula(): Formula {
    const statements: Statement[] = [];

    while (this.currentToken !== null) {
      // 跳过连续的空行
      while (this.currentToken && this.currentToken.tokenType.toString() === TokenType.Newline) {
        this.advance();
      }
      
      // 如果遇到文件结束则退出
      if (!this.currentToken || this.currentToken.tokenType.toString() === TokenType.Eof) {
        break;
      }
      
      const statement = this.parseStatement();
      statements.push(statement);
      
      // 语句结束后，跳过换行符（如果存在）
      if (this.currentToken && this.currentToken.tokenType.toString() === TokenType.Newline) {
        this.advance();
      }
    }

    return createFormula(statements);
  }

  // 解析单个语句
  private parseStatement(): Statement {
    const token = this.currentToken!;

    if (token.tokenType === TokenType.Identifier) {
      const nextToken = this.peekToken();
      
      if (nextToken?.tokenType === TokenType.ColonAssign) {
        // 赋值语句：VAR := 表达式;
        return this.parseAssignmentStatement();
      } else if (nextToken?.tokenType === TokenType.Colon) {
        // 命名输出语句：名称: 表达式 [, 样式...];
        return this.parseNamedOutputStatement();
      } else {
        // 匿名输出语句：表达式 [, 样式...];
        return this.parseAnonymousOutputStatement();
      }
    }

    // 匿名输出语句
    return this.parseAnonymousOutputStatement();
  }

  // 解析赋值语句
  private parseAssignmentStatement(): Statement {
    const variable = this.expectToken(TokenType.Identifier).lexeme;
    this.expectToken(TokenType.ColonAssign);
    const expr = this.parseExpression(0);
    // 不需要分号，通过换行或文件结束来分隔语句
    return createAssignmentStatement(variable, expr);
  }

  // 解析命名输出语句
  private parseNamedOutputStatement(): Statement {
    const name = this.expectToken(TokenType.Identifier).lexeme;
    this.expectToken(TokenType.Colon);
    const expr = this.parseExpression(0);
    const styles = this.parsePlotStyles();
    // 不需要分号，通过换行或文件结束来分隔语句
    return createOutputStatement(name, expr, styles);
  }

  // 解析匿名输出语句
  private parseAnonymousOutputStatement(): Statement {
    const expr = this.parseExpression(0);
    const styles = this.parsePlotStyles();
    // 不需要分号，通过换行或文件结束来分隔语句
    return createOutputStatement(null, expr, styles);
  }

  // 解析绘图样式
  private parsePlotStyles(): string[] {
    const styles: string[] = [];
    
    while (this.currentToken?.tokenType === TokenType.Comma) {
      this.advance(); // 跳过逗号
      const styleToken = this.expectToken(TokenType.Identifier);
      styles.push(styleToken.lexeme);
    }
    
    return styles;
  }

  // 解析表达式（核心的Pratt解析算法）
  private parseExpression(minPrecedence: number): Expr {
    let left = this.parsePrefix();

    while (this.currentToken !== null) {
      const token = this.currentToken;
      const [leftBindingPower, rightBindingPower] = this.getInfixBindingPower(token);

      if (leftBindingPower === 0 || leftBindingPower < minPrecedence) {
        break;
      }

      this.advance(); // 消耗运算符
      
      const right = this.parseExpression(rightBindingPower);
      const operator = this.getBinaryOperator(token.tokenType);
      
      left = createBinaryOpExpr(left, operator, right);
    }

    return left;
  }

  // 解析前缀表达式
  private parsePrefix(): Expr {
    const token = this.currentToken!;

    switch (token.tokenType) {
      case TokenType.Number:
        this.advance();
        return createLiteralExpr(parseFloat(token.lexeme));

      case TokenType.If:
      case TokenType.Identifier: {
        const nextToken = this.peekToken();
        if (nextToken?.tokenType === TokenType.LParen) {
          return this.parseFunctionCall(token.tokenType);
        }
        this.advance();
        return createVariableExpr(token.lexeme);
      }

      case TokenType.LParen:
        return this.parseGroupedExpression();

      case TokenType.Minus:
      case TokenType.Not:
        return this.parseUnaryExpression();

      default:
        throw new Error(`Unexpected token 【${token.tokenType} 】 at position  ${token.line}:${token.column}`);
    }
  }

  // 解析函数调用
  private parseFunctionCall(tokenType:TokenType): Expr {
    const name = this.expectToken(tokenType).lexeme;
    this.expectToken(TokenType.LParen);
    
    // 为IF函数特殊处理
    if (name.toUpperCase() === 'IF') {
      return this.parseIfFunction();
    }
    
    const args: Expr[] = [];
    
    if (this.currentToken?.tokenType !== TokenType.RParen) {
      args.push(this.parseExpression(0));
      
      while (this.currentToken?.tokenType === TokenType.Comma) {
        this.advance();
        args.push(this.parseExpression(0));
      }
    }
    
    this.expectToken(TokenType.RParen);
    return createFunctionCallExpr(name, args);
  }

  // 解析IF函数 (IF(条件, 真值, 假值))
  private parseIfFunction(): Expr {
    const args: Expr[] = [];
    
    // 解析条件表达式
    args.push(this.parseExpression(0));
    
    // 检查是否有逗号分隔符
    if (this.currentToken?.tokenType !== TokenType.Comma) {
      throw new Error('IF函数需要逗号分隔条件表达式和真值');
    }
    this.advance(); // 跳过逗号
    
    // 解析真值表达式
    args.push(this.parseExpression(0));
    
    // 检查是否有第二个逗号分隔符
    if (this.currentToken?.tokenType !== TokenType.Comma) {
      throw new Error('IF函数需要逗号分隔真值和假值');
    }
    this.advance(); // 跳过逗号
    
    // 解析假值表达式
    args.push(this.parseExpression(0));
    
    this.expectToken(TokenType.RParen);
    return createFunctionCallExpr('IF', args);
  }

  // 解析括号分组表达式
  private parseGroupedExpression(): Expr {
    this.expectToken(TokenType.LParen);
    const expr = this.parseExpression(0);
    this.expectToken(TokenType.RParen);
    return createGroupedExpr(expr);
  }

  // 解析一元表达式
  private parseUnaryExpression(): Expr {
    const token = this.currentToken!;
    this.advance();
    
    const operator = token.tokenType === TokenType.Minus ? UnaryOperator.Neg : UnaryOperator.Not;
    const operand = this.parseExpression(this.getPrefixBindingPower(token.tokenType));
    
    return createUnaryOpExpr(operator, operand);
  }

  // 获取中缀运算符的绑定强度
  private getInfixBindingPower(token: Token): [number, number] {
    switch (token.tokenType) {
      case TokenType.Or: return [1, 2];
      case TokenType.And: return [3, 4];
      case TokenType.Gt:
      case TokenType.Lt:
      case TokenType.GtEq:
      case TokenType.LtEq:
      case TokenType.EqEq:
      case TokenType.NotEq: return [5, 6];
      case TokenType.Plus: return [7, 8];
      case TokenType.Minus: return [7, 8];
      case TokenType.Star: return [9, 10];
      case TokenType.Slash: return [9, 10];
      default: return [0, 0];
    }
  }

  // 获取前缀运算符的绑定强度
  private getPrefixBindingPower(tokenType: TokenType): number {
    switch (tokenType) {
      case TokenType.Minus:
      case TokenType.Not: return 11;
      default: return 0;
    }
  }

  // 获取二元运算符
  private getBinaryOperator(tokenType: TokenType): BinaryOperator {
    switch (tokenType) {
      case TokenType.Plus: return BinaryOperator.Add;
      case TokenType.Minus: return BinaryOperator.Sub;
      case TokenType.Star: return BinaryOperator.Mul;
      case TokenType.Slash: return BinaryOperator.Div;
      case TokenType.Gt: return BinaryOperator.Gt;
      case TokenType.Lt: return BinaryOperator.Lt;
      case TokenType.GtEq: return BinaryOperator.GtEq;
      case TokenType.LtEq: return BinaryOperator.LtEq;
      case TokenType.EqEq: return BinaryOperator.EqEq;
      case TokenType.EqEq: return BinaryOperator.EqEq;
      case TokenType.NotEq: return BinaryOperator.NotEq;
      case TokenType.And: return BinaryOperator.And;
      case TokenType.Or: return BinaryOperator.Or;
      default: throw new Error(`Invalid binary operator: ${tokenType}`);
    }
  }

  // 辅助方法
  private advance(): void {
    const result = this.lexer.next();
    this.currentToken = result.done ? null : result.value;
  }

  private peekToken(): Token | null {
    const result = this.lexer.peek();
    return result.done ? null : result.value;
  }

  private expectToken(expectedType: TokenType): Token {
    const token = this.currentToken;
    
    if (!token) {
      throw new Error(`Expected ${expectedType} but got end of file`);
    }
    
    if (token.tokenType !== expectedType) {
      throw new Error(`Expected ${expectedType} but got ${token.tokenType} at position ${token.line}:${token.column}`);
    }
    
    this.advance();
    return token;
  }
}

// 创建解析器实例
export function createParser(input: string): Parser {
  const lexer = new Lexer(input);
  return new Parser(() => lexer.nextToken());
}
