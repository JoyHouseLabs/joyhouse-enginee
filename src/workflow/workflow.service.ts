import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowStatus } from './entities/workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowExecutionStep } from './entities/workflow-execution-step.entity';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ExecuteWorkflowDto,
  ContinueExecutionDto,
  ApprovalDto,
} from './dto/workflow.dto';
import { User } from '../user/user.entity';
import { WorkflowEngineService } from './services/workflow-engine.service';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowExecutionStep)
    private readonly stepRepository: Repository<WorkflowExecutionStep>,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  async create(
    createWorkflowDto: CreateWorkflowDto,
    user: User,
  ): Promise<Workflow> {
    const workflowData = {
      name: createWorkflowDto.name,
      description: createWorkflowDto.description,
      nodes: createWorkflowDto.nodes as any,
      edges: createWorkflowDto.edges as any,
      variables: createWorkflowDto.variables,
      triggers: createWorkflowDto.triggers as any,
      isTemplate: createWorkflowDto.isTemplate || false,
      user,
    };

    const workflow = this.workflowRepository.create(workflowData);
    return this.workflowRepository.save(workflow);
  }

  async findAll(user: User): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: [{ user: { id: user.id } }, { isTemplate: true }],
      relations: ['executions'],
    });
  }

  async findOne(id: string, user: User): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: [
        { id, user: { id: user.id } },
        { id, isTemplate: true },
      ],
      relations: ['executions'],
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async update(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
    user: User,
  ): Promise<Workflow> {
    const workflow = await this.findOne(id, user);
    Object.assign(workflow, updateWorkflowDto);
    return this.workflowRepository.save(workflow);
  }

  async remove(id: string, user: User): Promise<void> {
    const workflow = await this.findOne(id, user);
    await this.workflowRepository.remove(workflow);
  }

  async publish(id: string, user: User): Promise<Workflow> {
    const workflow = await this.findOne(id, user);
    workflow.status = WorkflowStatus.PUBLISHED;
    return this.workflowRepository.save(workflow);
  }

  async archive(id: string, user: User): Promise<Workflow> {
    const workflow = await this.findOne(id, user);
    workflow.status = WorkflowStatus.ARCHIVED;
    return this.workflowRepository.save(workflow);
  }

  async execute(
    id: string,
    executeWorkflowDto: ExecuteWorkflowDto,
    user: User,
  ): Promise<WorkflowExecution> {
    const workflow = await this.findOne(id, user);

    if (workflow.status !== WorkflowStatus.PUBLISHED) {
      throw new Error('Only published workflows can be executed');
    }

    return this.workflowEngine.executeWorkflow(
      workflow,
      user,
      executeWorkflowDto.input,
      executeWorkflowDto.triggerType,
      executeWorkflowDto.triggerData,
    );
  }

  async getExecutions(
    workflowId: string,
    user: User,
  ): Promise<WorkflowExecution[]> {
    const workflow = await this.findOne(workflowId, user);
    return this.executionRepository.find({
      where: { workflow: { id: workflow.id } },
      relations: ['steps'],
      order: { createdAt: 'DESC' },
    });
  }

  async getExecution(
    executionId: string,
    user: User,
  ): Promise<WorkflowExecution> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId, user: { id: user.id } },
      relations: ['workflow', 'steps'],
    });

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${executionId} not found`);
    }

    return execution;
  }

  async getExecutionSteps(
    executionId: string,
    user: User,
  ): Promise<WorkflowExecutionStep[]> {
    const execution = await this.getExecution(executionId, user);
    return this.stepRepository.find({
      where: { execution: { id: execution.id } },
      order: { createdAt: 'ASC' },
    });
  }

  async continueExecution(
    executionId: string,
    continueDto: ContinueExecutionDto,
    user: User,
  ): Promise<void> {
    const execution = await this.getExecution(executionId, user);
    await this.workflowEngine.continueExecution(
      execution.id,
      continueDto.input,
    );
  }

  async handleApproval(
    executionId: string,
    approvalDto: ApprovalDto,
    user: User,
  ): Promise<void> {
    const execution = await this.getExecution(executionId, user);
    await this.workflowEngine.handleApproval(
      execution.id,
      approvalDto.approved,
      approvalDto.comment,
    );
  }

  async cancelExecution(
    executionId: string,
    user: User,
  ): Promise<WorkflowExecution> {
    const execution = await this.getExecution(executionId, user);
    execution.status = 'cancelled' as any;
    execution.completedAt = new Date();
    return this.executionRepository.save(execution);
  }

  async getTemplates(): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { isTemplate: true },
    });
  }

  async createFromTemplate(
    templateId: string,
    name: string,
    user: User,
  ): Promise<Workflow> {
    const template = await this.workflowRepository.findOne({
      where: { id: templateId, isTemplate: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    const workflow = this.workflowRepository.create({
      name,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges,
      variables: template.variables,
      triggers: template.triggers,
      user,
      isTemplate: false,
    });

    return this.workflowRepository.save(workflow);
  }

  async validateWorkflow(
    id: string,
    user: User,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const workflow = await this.findOne(id, user);
    const errors: string[] = [];

    // Check for start node
    const startNodes = workflow.nodes.filter((node) => node.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have at least one start node');
    } else if (startNodes.length > 1) {
      errors.push('Workflow can only have one start node');
    }

    // Check for end node
    const endNodes = workflow.nodes.filter((node) => node.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one end node');
    }

    // Check for orphaned nodes
    const nodeIds = new Set(workflow.nodes.map((node) => node.id));
    const connectedNodes = new Set();

    workflow.edges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const orphanedNodes = workflow.nodes.filter(
      (node) => node.type !== 'start' && !connectedNodes.has(node.id),
    );

    if (orphanedNodes.length > 0) {
      errors.push(
        `Orphaned nodes found: ${orphanedNodes.map((n) => n.label).join(', ')}`,
      );
    }

    // Check for invalid edges
    workflow.edges.forEach((edge) => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    });

    // Check node-specific validations
    workflow.nodes.forEach((node) => {
      switch (node.type) {
        case 'tool':
          if (!node.data.toolId) {
            errors.push(`Tool node "${node.label}" must specify toolId`);
          }
          break;
        case 'agent':
          if (!node.data.agentId) {
            errors.push(`Agent node "${node.label}" must specify agentId`);
          }
          break;
        case 'condition':
          if (!node.data.condition) {
            errors.push(
              `Condition node "${node.label}" must specify condition`,
            );
          }
          break;
        case 'script':
          if (!node.data.script) {
            errors.push(`Script node "${node.label}" must specify script`);
          }
          break;
        case 'delay':
          if (!node.data.delayMs || node.data.delayMs <= 0) {
            errors.push(
              `Delay node "${node.label}" must specify valid delayMs`,
            );
          }
          break;
        case 'wait_event':
          if (!node.data.eventType) {
            errors.push(
              `Wait event node "${node.label}" must specify eventType`,
            );
          }
          break;
        case 'loop_start':
          if (!node.data.loopId) {
            errors.push(`Loop start node "${node.label}" must specify loopId`);
          }
          if (node.data.maxIterations && node.data.maxIterations <= 0) {
            errors.push(
              `Loop start node "${node.label}" maxIterations must be positive`,
            );
          }
          break;
        case 'loop_end':
          if (!node.data.loopId) {
            errors.push(`Loop end node "${node.label}" must specify loopId`);
          }
          break;
        case 'loop_condition':
          if (!node.data.loopId) {
            errors.push(
              `Loop condition node "${node.label}" must specify loopId`,
            );
          }
          break;
        case 'parallel_start':
          if (!node.data.parallelId) {
            errors.push(
              `Parallel start node "${node.label}" must specify parallelId`,
            );
          }
          if (node.data.parallelTimeout && node.data.parallelTimeout <= 0) {
            errors.push(
              `Parallel start node "${node.label}" parallelTimeout must be positive`,
            );
          }
          break;
        case 'parallel_end':
          if (!node.data.parallelId) {
            errors.push(
              `Parallel end node "${node.label}" must specify parallelId`,
            );
          }
          break;
        case 'parallel_branch':
          if (!node.data.parallelId) {
            errors.push(
              `Parallel branch node "${node.label}" must specify parallelId`,
            );
          }
          if (!node.data.branchName) {
            errors.push(
              `Parallel branch node "${node.label}" must specify branchName`,
            );
          }
          break;
      }
    });

    // 验证循环结构
    const loopValidation = this.validateLoopStructure(
      workflow.nodes,
      workflow.edges,
    );
    errors.push(...loopValidation);

    // 验证并发结构
    const parallelValidation = this.validateParallelStructure(
      workflow.nodes,
      workflow.edges,
    );
    errors.push(...parallelValidation);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateLoopStructure(nodes: any[], edges: any[]): string[] {
    const errors: string[] = [];
    const loopStarts = nodes.filter((node) => node.type === 'loop_start');
    const loopEnds = nodes.filter((node) => node.type === 'loop_end');
    const loopConditions = nodes.filter(
      (node) => node.type === 'loop_condition',
    );

    // 检查每个loop_start都有对应的loop_end
    loopStarts.forEach((startNode) => {
      const loopId = startNode.data.loopId;
      const matchingEnds = loopEnds.filter(
        (endNode) => endNode.data.loopId === loopId,
      );

      if (matchingEnds.length === 0) {
        errors.push(
          `Loop start "${startNode.label}" (${loopId}) has no matching loop end`,
        );
      } else if (matchingEnds.length > 1) {
        errors.push(
          `Loop start "${startNode.label}" (${loopId}) has multiple matching loop ends`,
        );
      }
    });

    // 检查每个loop_end都有对应的loop_start
    loopEnds.forEach((endNode) => {
      const loopId = endNode.data.loopId;
      const matchingStarts = loopStarts.filter(
        (startNode) => startNode.data.loopId === loopId,
      );

      if (matchingStarts.length === 0) {
        errors.push(
          `Loop end "${endNode.label}" (${loopId}) has no matching loop start`,
        );
      }
    });

    // 检查loop_condition节点的loopId是否有效
    loopConditions.forEach((conditionNode) => {
      const loopId = conditionNode.data.loopId;
      const matchingStarts = loopStarts.filter(
        (startNode) => startNode.data.loopId === loopId,
      );

      if (matchingStarts.length === 0) {
        errors.push(
          `Loop condition "${conditionNode.label}" (${loopId}) has no matching loop start`,
        );
      }
    });

    // 检查循环路径的连通性
    loopStarts.forEach((startNode) => {
      const loopId = startNode.data.loopId;
      const endNode = loopEnds.find((node) => node.data.loopId === loopId);

      if (endNode) {
        // 检查是否存在从start到end的路径
        const hasPath = this.hasPathBetweenNodes(
          startNode.id,
          endNode.id,
          nodes,
          edges,
        );
        if (!hasPath) {
          errors.push(
            `No path found from loop start "${startNode.label}" to loop end "${endNode.label}"`,
          );
        }
      }
    });

    return errors;
  }

  private hasPathBetweenNodes(
    startId: string,
    endId: string,
    nodes: any[],
    edges: any[],
  ): boolean {
    if (startId === endId) return true;

    const visited = new Set<string>();
    const queue = [startId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === endId) return true;

      // 找到所有从当前节点出发的边
      const outgoingEdges = edges.filter((edge) => edge.source === currentId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return false;
  }

  private validateParallelStructure(nodes: any[], edges: any[]): string[] {
    const errors: string[] = [];
    const parallelStarts = nodes.filter(
      (node) => node.type === 'parallel_start',
    );
    const parallelEnds = nodes.filter((node) => node.type === 'parallel_end');
    const parallelBranches = nodes.filter(
      (node) => node.type === 'parallel_branch',
    );

    // 检查每个parallel_start都有对应的parallel_end
    parallelStarts.forEach((startNode) => {
      const parallelId = startNode.data.parallelId;
      const matchingEnds = parallelEnds.filter(
        (endNode) => endNode.data.parallelId === parallelId,
      );

      if (matchingEnds.length === 0) {
        errors.push(
          `Parallel start "${startNode.label}" (${parallelId}) has no matching parallel end`,
        );
      } else if (matchingEnds.length > 1) {
        errors.push(
          `Parallel start "${startNode.label}" (${parallelId}) has multiple matching parallel ends`,
        );
      }
    });

    // 检查每个parallel_end都有对应的parallel_start
    parallelEnds.forEach((endNode) => {
      const parallelId = endNode.data.parallelId;
      const matchingStarts = parallelStarts.filter(
        (startNode) => startNode.data.parallelId === parallelId,
      );

      if (matchingStarts.length === 0) {
        errors.push(
          `Parallel end "${endNode.label}" (${parallelId}) has no matching parallel start`,
        );
      }
    });

    // 检查parallel_branch节点的parallelId是否有效
    parallelBranches.forEach((branchNode) => {
      const parallelId = branchNode.data.parallelId;
      const matchingStarts = parallelStarts.filter(
        (startNode) => startNode.data.parallelId === parallelId,
      );

      if (matchingStarts.length === 0) {
        errors.push(
          `Parallel branch "${branchNode.label}" (${parallelId}) has no matching parallel start`,
        );
      }
    });

    // 检查并发路径的连通性
    parallelStarts.forEach((startNode) => {
      const parallelId = startNode.data.parallelId;
      const endNode = parallelEnds.find(
        (node) => node.data.parallelId === parallelId,
      );

      if (endNode) {
        // 检查是否存在从start到end的路径
        const hasPath = this.hasPathBetweenNodes(
          startNode.id,
          endNode.id,
          nodes,
          edges,
        );
        if (!hasPath) {
          errors.push(
            `No path found from parallel start "${startNode.label}" to parallel end "${endNode.label}"`,
          );
        }
      }
    });

    return errors;
  }
}
