import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto, UpdateWorkflowDto, ExecuteWorkflowDto, ContinueExecutionDto, ApprovalDto } from './dto/workflow.dto';
import { Workflow } from './entities/workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowExecutionStep } from './entities/workflow-execution-step.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User as UserDecorator } from '../decorators/user.decorator';
import { User } from '../user/user.entity';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @ApiOperation({ summary: '创建工作流' })
  @ApiResponse({ type: Workflow })
  create(@Body() createWorkflowDto: CreateWorkflowDto, @UserDecorator() user: User) {
    return this.workflowService.create(createWorkflowDto, user);
  }

  @Get()
  @ApiOperation({ summary: '获取所有工作流' })
  @ApiResponse({ type: [Workflow] })
  findAll(@UserDecorator() user: User) {
    return this.workflowService.findAll(user);
  }

  @Get('templates')
  @ApiOperation({ summary: '获取工作流模板' })
  @ApiResponse({ type: [Workflow] })
  getTemplates() {
    return this.workflowService.getTemplates();
  }

  @Post('templates/:templateId/create')
  @ApiOperation({ summary: '从模板创建工作流' })
  @ApiResponse({ type: Workflow })
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Body('name') name: string,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.createFromTemplate(templateId, name, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定工作流' })
  @ApiResponse({ type: Workflow })
  findOne(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新工作流' })
  @ApiResponse({ type: Workflow })
  update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.update(id, updateWorkflowDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工作流' })
  @ApiResponse({ description: '删除成功' })
  remove(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.remove(id, user);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布工作流' })
  @ApiResponse({ type: Workflow })
  publish(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.publish(id, user);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档工作流' })
  @ApiResponse({ type: Workflow })
  archive(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.archive(id, user);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: '验证工作流' })
  @ApiResponse({ description: '验证结果' })
  validate(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.validateWorkflow(id, user);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: '执行工作流' })
  @ApiResponse({ type: WorkflowExecution })
  execute(
    @Param('id') id: string,
    @Body() executeWorkflowDto: ExecuteWorkflowDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.execute(id, executeWorkflowDto, user);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: '获取工作流执行历史' })
  @ApiResponse({ type: [WorkflowExecution] })
  getExecutions(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.getExecutions(id, user);
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: '获取指定执行记录' })
  @ApiResponse({ type: WorkflowExecution })
  getExecution(@Param('executionId') executionId: string, @UserDecorator() user: User) {
    return this.workflowService.getExecution(executionId, user);
  }

  @Get('executions/:executionId/steps')
  @ApiOperation({ summary: '获取执行步骤' })
  @ApiResponse({ type: [WorkflowExecutionStep] })
  getExecutionSteps(@Param('executionId') executionId: string, @UserDecorator() user: User) {
    return this.workflowService.getExecutionSteps(executionId, user);
  }

  @Post('executions/:executionId/continue')
  @ApiOperation({ summary: '继续执行工作流' })
  @ApiResponse({ description: '继续执行成功' })
  continueExecution(
    @Param('executionId') executionId: string,
    @Body() continueDto: ContinueExecutionDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.continueExecution(executionId, continueDto, user);
  }

  @Post('executions/:executionId/approve')
  @ApiOperation({ summary: '审批工作流' })
  @ApiResponse({ description: '审批成功' })
  handleApproval(
    @Param('executionId') executionId: string,
    @Body() approvalDto: ApprovalDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.handleApproval(executionId, approvalDto, user);
  }

  @Post('executions/:executionId/cancel')
  @ApiOperation({ summary: '取消执行' })
  @ApiResponse({ type: WorkflowExecution })
  cancelExecution(@Param('executionId') executionId: string, @UserDecorator() user: User) {
    return this.workflowService.cancelExecution(executionId, user);
  }
} 