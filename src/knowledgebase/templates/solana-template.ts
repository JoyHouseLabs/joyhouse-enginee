export const SolanaKnowledgebaseTemplate = {
  name: 'Solana 编程手册',
  description: '最新的 Solana 区块链开发文档和代码规范',
  type: 'manual',
  metadata: {
    language: 'solana',
    version: '1.18.0',
    source: 'official',
    tags: ['blockchain', 'smart-contract', 'rust', 'web3', 'solana'],
    lastUpdated: new Date(),
  },
  processingConfig: {
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingModel: 'text-embedding-3-small',
    enableCodeParsing: true,
    enableStructureExtraction: true,
  },
  accessControl: {
    isPublic: false,
    allowedRoles: ['developer', 'architect', 'blockchain-developer'],
  },
  typicalQuery: '如何创建 Solana 程序？',
  prompt: `你是一个 Solana 区块链开发专家。请基于最新的 Solana 文档和代码规范来回答问题。
  
重点关注：
1. Solana 程序开发最佳实践
2. 账户模型和数据结构
3. 指令处理和错误处理
4. 安全性考虑
5. 性能优化建议

请确保提供的代码示例符合最新的 Solana 语法规范。`,
};

export const SolanaCodePatterns = {
  // Solana 程序入口点
  programEntry: /^use\s+solana_program::/m,
  
  // 指令定义
  instructionEnum: /#\[derive\(BorshDeserialize,\s*BorshSerialize\)\]\s*pub\s+enum\s+\w+Instruction/,
  
  // 账户结构
  accountStruct: /#\[derive\(Accounts\)\]\s*pub\s+struct\s+\w+/,
  
  // 程序函数
  programFunction: /pub\s+fn\s+process_instruction\s*\(/,
  
  // 错误定义
  errorEnum: /#\[derive\(Error\)\]\s*pub\s+enum\s+\w+Error/,
  
  // 测试函数
  testFunction: /#\[cfg\(test\)\][\s\S]*?#\[test\]/,
};

export const SolanaKeywords = [
  // 核心概念
  'program', 'instruction', 'account', 'signer', 'lamports',
  'pubkey', 'keypair', 'transaction', 'blockhash', 'slot',
  
  // 数据类型
  'AccountInfo', 'ProgramResult', 'ProgramError', 'Pubkey',
  'SystemProgram', 'Rent', 'Clock', 'Sysvar',
  
  // 宏和属性
  'derive', 'Accounts', 'BorshSerialize', 'BorshDeserialize',
  'Error', 'cfg', 'test',
  
  // 常用函数
  'process_instruction', 'invoke', 'invoke_signed', 'create_account',
  'transfer', 'close_account', 'realloc',
  
  // 安全相关
  'owner', 'executable', 'rent_exempt', 'data_len',
  'is_signer', 'is_writable',
];

export const SolanaDocumentStructure = {
  sections: [
    {
      name: '程序架构',
      keywords: ['program', 'architecture', 'structure'],
      importance: 5,
    },
    {
      name: '账户模型',
      keywords: ['account', 'data', 'owner', 'rent'],
      importance: 5,
    },
    {
      name: '指令处理',
      keywords: ['instruction', 'process', 'handler'],
      importance: 4,
    },
    {
      name: '错误处理',
      keywords: ['error', 'result', 'panic'],
      importance: 4,
    },
    {
      name: '测试',
      keywords: ['test', 'mock', 'simulation'],
      importance: 3,
    },
    {
      name: '部署',
      keywords: ['deploy', 'build', 'upgrade'],
      importance: 3,
    },
  ],
};

export function createSolanaKnowledgebase(userId: string) {
  return {
    ...SolanaKnowledgebaseTemplate,
    userId,
    id: undefined, // 将由数据库生成
    createdAt: new Date(),
    updatedAt: new Date(),
  };
} 