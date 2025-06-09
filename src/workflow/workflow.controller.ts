import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ExecuteWorkflowDto,
  ContinueExecutionDto,
  ApprovalDto,
} from './dto/workflow.dto';
import { Workflow } from './entities/workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowExecutionStep } from './entities/workflow-execution-step.entity';
import { User as UserDecorator } from '../decorators/user.decorator';
import { User } from '../user/user.entity';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建工作流' })
  @ApiResponse({ status: 201, type: Workflow })
  create(
    @Body() createWorkflowDto: CreateWorkflowDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.create(createWorkflowDto, user);
  }

  @Get()
  @ApiOperation({ summary: '获取所有工作流' })
  @ApiResponse({ status: 200, type: [Workflow] })
  findAll(@UserDecorator() user: User) {
    return this.workflowService.findAll(user);
  }

  @Get('templates')
  @ApiOperation({ summary: '获取工作流模板' })
  @ApiResponse({ status: 200, type: [Workflow] })
  getTemplates() {
    return this.workflowService.getTemplates();
  }

  @Post('templates/:templateId')
  @ApiOperation({ summary: '从模板创建工作流' })
  @ApiResponse({ status: 201, type: Workflow })
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { name: string },
    @UserDecorator() user: User,
  ) {
    return this.workflowService.createFromTemplate(templateId, body.name, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定工作流' })
  @ApiResponse({ status: 200, type: Workflow })
  findOne(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新工作流' })
  @ApiResponse({ status: 200, type: Workflow })
  update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.update(id, updateWorkflowDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工作流' })
  @ApiResponse({ status: 200 })
  remove(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.remove(id, user);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布工作流' })
  @ApiResponse({ status: 200, type: Workflow })
  publish(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.publish(id, user);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档工作流' })
  @ApiResponse({ status: 200, type: Workflow })
  archive(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.archive(id, user);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: '验证工作流' })
  @ApiResponse({ status: 200 })
  validateWorkflow(@Param('id') id: string, @UserDecorator() user: User) {
    return this.workflowService.validateWorkflow(id, user);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: '执行工作流' })
  @ApiResponse({ status: 201, type: WorkflowExecution })
  execute(
    @Param('id') id: string,
    @Body() executeWorkflowDto: ExecuteWorkflowDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.execute(id, executeWorkflowDto, user);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: '获取工作流执行历史' })
  @ApiResponse({ status: 200, type: [WorkflowExecution] })
  getExecutions(
    @Param('id') workflowId: string,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.getExecutions(workflowId, user);
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: '获取执行详情' })
  @ApiResponse({ status: 200, type: WorkflowExecution })
  getExecution(
    @Param('executionId') executionId: string,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.getExecution(executionId, user);
  }

  @Get('executions/:executionId/steps')
  @ApiOperation({ summary: '获取执行步骤' })
  @ApiResponse({ status: 200, type: [WorkflowExecutionStep] })
  getExecutionSteps(
    @Param('executionId') executionId: string,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.getExecutionSteps(executionId, user);
  }

  @Post('executions/:executionId/continue')
  @ApiOperation({ summary: '继续执行' })
  @ApiResponse({ status: 200 })
  continueExecution(
    @Param('executionId') executionId: string,
    @Body() continueDto: ContinueExecutionDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.continueExecution(executionId, continueDto, user);
  }

  @Post('executions/:executionId/approve')
  @ApiOperation({ summary: '审批' })
  @ApiResponse({ status: 200 })
  approve(
    @Param('executionId') executionId: string,
    @Body() approvalDto: ApprovalDto,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.handleApproval(executionId, approvalDto, user);
  }

  @Post(':id/executions/:executionId/cancel')
  @ApiOperation({ summary: '取消工作流执行' })
  @ApiResponse({ status: 200, description: '工作流执行已取消' })
  async cancelExecution(
    @Param('executionId') executionId: string,
    @UserDecorator() user: User,
  ) {
    return this.workflowService.cancelExecution(executionId, user);
  }
}
