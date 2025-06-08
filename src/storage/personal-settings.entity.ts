import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 个人数据隐私设置
@Entity('personal_settings')
@Index(['userId'])
export class PersonalSettings {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64, unique: true })
  userId: string;

  // 数据隐私设置
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  privacySettings?: {
    // 数据可见性
    defaultVisibility: 'private' | 'friends' | 'organization' | 'public';
    allowDataMining: boolean; // 是否允许数据挖掘
    allowAITraining: boolean; // 是否允许AI训练使用
    allowAnalytics: boolean; // 是否允许分析统计
    
    // 分享设置
    shareSettings: {
      autoShare: boolean; // 是否自动分享
      shareWithAI: boolean; // 是否与AI分享
      shareLocation: boolean; // 是否分享位置信息
      shareMetadata: boolean; // 是否分享元数据
    };
    
    // 数据保留
    retentionPolicy: {
      keepDeleted: number; // 删除数据保留天数
      autoArchive: number; // 自动归档天数
      permanentDelete: number; // 永久删除天数
    };
    
    // 数据导出
    exportSettings: {
      allowExport: boolean;
      exportFormat: 'json' | 'csv' | 'pdf' | 'markdown';
      includeMetadata: boolean;
      includeHistory: boolean;
    };
  };

  // AI助手个性化设置
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  aiPreferences?: {
    // 助手个性
    assistantPersonality: 'professional' | 'friendly' | 'creative' | 'analytical';
    responseStyle: 'brief' | 'detailed' | 'conversational' | 'formal';
    language: string;
    
    // 学习偏好
    learningMode: {
      adaptToUser: boolean; // 是否适应用户习惯
      rememberPreferences: boolean; // 是否记住偏好
      suggestOptimizations: boolean; // 是否建议优化
    };
    
    // 内容偏好
    contentPreferences: {
      favoriteTopics: string[];
      avoidTopics: string[];
      preferredSources: string[];
      contentDepth: 'surface' | 'moderate' | 'deep';
    };
    
    // 通知设置
    notifications: {
      dailySummary: boolean;
      weeklyInsights: boolean;
      importantUpdates: boolean;
      systemAlerts: boolean;
      quietHours: {
        enabled: boolean;
        start: string; // HH:mm
        end: string; // HH:mm
      };
    };
  };

  // 工作流偏好
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  workflowPreferences?: {
    // 自动化设置
    automation: {
      autoImport: boolean;
      autoExtract: boolean;
      autoSummarize: boolean;
      autoTag: boolean;
      autoLink: boolean;
    };
    
    // 处理偏好
    processing: {
      batchSize: number;
      processingTime: 'immediate' | 'scheduled' | 'manual';
      qualityThreshold: number; // 0-1
    };
    
    // 组织偏好
    organization: {
      defaultStructure: 'flat' | 'hierarchical' | 'topic-based' | 'date-based';
      namingConvention: string;
      autoFoldering: boolean;
    };
  };

  // 界面和体验设置
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  uiPreferences?: {
    // 主题设置
    theme: 'light' | 'dark' | 'auto';
    accentColor: string;
    
    // 布局偏好
    layout: 'sidebar' | 'tabs' | 'cards';
    density: 'compact' | 'comfortable' | 'spacious';
    
    // 功能显示
    features: {
      showPreview: boolean;
      showMetadata: boolean;
      showTags: boolean;
      showRelations: boolean;
    };
    
    // 快捷键
    shortcuts: Record<string, string>;
  };

  // 数据使用统计偏好
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  analyticsSettings?: {
    // 统计收集
    collectUsageStats: boolean;
    collectPerformanceStats: boolean;
    collectErrorLogs: boolean;
    
    // 个人分析
    personalAnalytics: {
      trackProductivity: boolean;
      trackLearningProgress: boolean;
      trackContentInteraction: boolean;
      generateInsights: boolean;
    };
    
    // 数据共享
    shareAnonymousStats: boolean;
    contributeToImprovement: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 个人推荐设置
@Entity('personal_recommendations')
@Index(['userId'])
@Index(['recommendationType'])
export class PersonalRecommendation {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  userId: string;

  // 推荐类型
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['content', 'workflow', 'connection', 'optimization', 'learning'] 
  })
  recommendationType: 'content' | 'workflow' | 'connection' | 'optimization' | 'learning';

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  // 推荐内容
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  recommendation?: {
    // 推荐的资源
    resourceType?: string;
    resourceId?: string;
    resourceUrl?: string;
    
    // 推荐理由
    reason: string;
    confidence: number; // 0-1
    
    // 预期效果
    expectedBenefit: string;
    estimatedImpact: 'low' | 'medium' | 'high';
    
    // 行动建议
    actionSteps?: Array<{
      step: number;
      description: string;
      estimated_time?: number;
    }>;
  };

  // 推荐状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['pending', 'viewed', 'accepted', 'rejected', 'implemented'], 
    default: 'pending' 
  })
  status: 'pending' | 'viewed' | 'accepted' | 'rejected' | 'implemented';

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  userFeedback?: string;

  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true })
  userRating?: number; // 1-5

  // 优先级
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 