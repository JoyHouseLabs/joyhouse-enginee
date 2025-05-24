import { BadRequestException } from '@nestjs/common';

export function validateCrontab(crontab: string): boolean {
  // crontab 格式: 分 时 日 月 周 命令
  const parts = crontab.split(' ');
  if (parts.length < 5) {
    return false;
  }

  const [minute, hour, day, month, weekday] = parts;

  // 验证分钟 (0-59)
  if (!validateCrontabPart(minute, 0, 59)) {
    return false;
  }

  // 验证小时 (0-23)
  if (!validateCrontabPart(hour, 0, 23)) {
    return false;
  }

  // 验证日期 (1-31)
  if (!validateCrontabPart(day, 1, 31)) {
    return false;
  }

  // 验证月份 (1-12)
  if (!validateCrontabPart(month, 1, 12)) {
    return false;
  }

  // 验证星期 (0-6)
  if (!validateCrontabPart(weekday, 0, 6)) {
    return false;
  }

  return true;
}

function validateCrontabPart(part: string, min: number, max: number): boolean {
  // 处理 * 通配符
  if (part === '*') {
    return true;
  }

  // 处理逗号分隔的列表
  if (part.includes(',')) {
    return part.split(',').every(p => validateCrontabPart(p.trim(), min, max));
  }

  // 处理范围
  if (part.includes('-')) {
    const [start, end] = part.split('-').map(p => parseInt(p.trim()));
    return !isNaN(start) && !isNaN(end) && 
           start >= min && end <= max && 
           start <= end;
  }

  // 处理步长
  if (part.includes('/')) {
    const [value, step] = part.split('/').map(p => p.trim());
    if (value === '*') {
      const stepNum = parseInt(step);
      return !isNaN(stepNum) && stepNum > 0;
    }
    return validateCrontabPart(value, min, max);
  }

  // 处理单个数字
  const num = parseInt(part);
  return !isNaN(num) && num >= min && num <= max;
}

export function validateTaskParams(type: string, params: any): void {
  if (type === 'cron') {
    if (!params || typeof params !== 'object' || !params.crontab) {
      throw new BadRequestException('Cron task must have a crontab expression');
    }

    if (typeof params.crontab !== 'string') {
      throw new BadRequestException('Crontab must be a string');
    }

    if (!validateCrontab(params.crontab)) {
      throw new BadRequestException('Invalid crontab expression');
    }
  }
} 