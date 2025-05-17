import * as fs from 'fs';
import * as path from 'path';

export interface ControllerMethod {
  controller: string;
  method: string;
}

/**
 * 扫描 src 目录下所有 controller，返回 controller/method 列表
 */
export function scanAllControllerMethods(srcDir: string): ControllerMethod[] {
  const results: ControllerMethod[] = [];
  const files = walkSync(srcDir);
  for (const file of files) {
    if (!file.endsWith('.controller.ts')) continue;
    const content = fs.readFileSync(file, 'utf-8');
    // 匹配 class 名
    const classMatch = content.match(/export class (\w+)\s*\{/);
    if (!classMatch) continue;
    const controller = classMatch[1].replace('Controller', '').toLowerCase();
    // 匹配方法名
    const methodMatches = [...content.matchAll(/\n\s*(?:async\s+)?(\w+)\s*\(/g)];
    for (const m of methodMatches) {
      const method = m[1];
      // 排除构造函数、私有方法等
      if (['constructor'].includes(method) || method.startsWith('_')) continue;
      results.push({ controller, method });
    }
  }
  return results;
}

function walkSync(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkSync(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}
