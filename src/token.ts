// 词法单元类型定义，对应Rust的token.rs

export enum TokenType {
  // 单字符Token
  LParen = 'LParen',       // ( 
  RParen = 'RParen',       // )
  Comma = 'Comma',         // ,
  Semicolon = 'Semicolon', // ;
  Plus = 'Plus',           // +
  Minus = 'Minus',         // -
  Star = 'Star',           // *
  Slash = 'Slash',         // /
  Colon = 'Colon',         // :
  Gt = 'Gt',               // >
  Lt = 'Lt',               // <
  
  // 多字符Token
  ColonAssign = 'ColonAssign', // :=
  GtEq = 'GtEq',               // >=
  LtEq = 'LtEq',               // <=
  NotEq = 'NotEq',             // <>
  EqEq = 'EqEq',               // ==
  
  // 字面量
  Identifier = 'Identifier',   // 标识符
  Number = 'Number',           // 数字
  String = 'String',           // 字符串
  
  // 关键词
  If = 'If',
  Then = 'Then', 
  Else = 'Else',
  And = 'And',
  Or = 'Or',
  Not = 'Not',
  
  // 特殊Token
  Newline = 'Newline',     // 换行符
  Illegal = 'Illegal',     // 非法Token
  Eof = 'Eof',            // 文件结束
}

export interface Token {
  tokenType: TokenType;
  lexeme: string;
  line: number;
  column: number;
}

// Token构造函数
export function createToken(
  tokenType: TokenType,
  lexeme: string,
  line: number,
  column: number
): Token {
  return {
    tokenType,
    lexeme,
    line,
    column,
  };
}

// 关键词映射表
const KEYWORDS: Record<string, TokenType> = {
  'IF': TokenType.If,
  'THEN': TokenType.Then,
  'ELSE': TokenType.Else,
  'AND': TokenType.And,
  'OR': TokenType.Or,
  'NOT': TokenType.Not,
};

// 检查是否为关键词
export function lookupKeyword(ident: string): TokenType {
  return KEYWORDS[ident.toUpperCase()] || TokenType.Identifier;
}

// 获取Token类型描述
export function getTokenTypeDescription(tokenType: TokenType): string {
  const descriptions: Record<TokenType, string> = {
    [TokenType.LParen]: '左括号',
    [TokenType.RParen]: '右括号',
    [TokenType.Comma]: '逗号',
    [TokenType.Semicolon]: '分号',
    [TokenType.Plus]: '加号',
    [TokenType.Minus]: '减号',
    [TokenType.Star]: '乘号',
    [TokenType.Slash]: '除号',
    [TokenType.Colon]: '冒号',
    [TokenType.Gt]: '大于号',
    [TokenType.Lt]: '小于号',
    [TokenType.ColonAssign]: '赋值符号',
    [TokenType.GtEq]: '大于等于',
    [TokenType.LtEq]: '小于等于',
    [TokenType.NotEq]: '不等于',
    [TokenType.EqEq]: '双等号',
    [TokenType.Identifier]: '标识符',
    [TokenType.Number]: '数字',
    [TokenType.String]: '字符串',
    [TokenType.If]: 'IF关键词',
    [TokenType.Then]: 'THEN关键词',
    [TokenType.Else]: 'ELSE关键词',
    [TokenType.And]: 'AND关键词',
    [TokenType.Or]: 'OR关键词',
    [TokenType.Not]: 'NOT关键词',
    [TokenType.Newline]: '换行符',
    [TokenType.Illegal]: '非法Token',
    [TokenType.Eof]: '文件结束',
  };
  
  return descriptions[tokenType];
}
