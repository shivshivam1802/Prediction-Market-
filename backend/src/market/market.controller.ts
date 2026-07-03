import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MarketService, CreateMarketDto, CreateTradeDto, CreateCommentDto } from './market.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Markets')
@Controller('markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get()
  @ApiOperation({ summary: 'Get all prediction markets with filter queries' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category (e.g. CRYPTO, POLITICS, SPORTS, AI)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for title, description, or tags' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (e.g. ACTIVE, RESOLVED)' })
  @ApiResponse({ status: 200, description: 'List of prediction markets retrieved successfully.' })
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.marketService.findAll(category, search, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific prediction market with trades, comments, and outcomes' })
  @ApiResponse({ status: 200, description: 'Prediction market details retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Market not found.' })
  findOne(@Param('id') id: string) {
    return this.marketService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new prediction market' })
  @ApiResponse({ status: 201, description: 'Prediction market created successfully.' })
  create(@Body() createMarketDto: CreateMarketDto) {
    return this.marketService.create(createMarketDto);
  }

  @Post(':id/trade')
  @ApiOperation({ summary: 'Submit a simulated trade (BUY or SELL) on a market' })
  @ApiResponse({ status: 201, description: 'Trade executed and state updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid trade input or rules violation.' })
  trade(@Param('id') id: string, @Body() createTradeDto: CreateTradeDto) {
    return this.marketService.trade(id, createTradeDto);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve a prediction market to a specific outcome' })
  @ApiResponse({ status: 200, description: 'Prediction market status set to RESOLVED.' })
  resolve(@Param('id') id: string, @Body('winningOutcomeId') winningOutcomeId: string) {
    return this.marketService.resolve(id, winningOutcomeId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a user comment to a specific market' })
  @ApiResponse({ status: 201, description: 'Comment created successfully.' })
  addComment(@Param('id') id: string, @Body() createCommentDto: CreateCommentDto) {
    return this.marketService.addComment(id, createCommentDto);
  }
}
