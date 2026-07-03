import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService, UpsertUserDto } from './user.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':walletAddress')
  @ApiOperation({ summary: 'Get user profile portfolio, active positions, and trade history by wallet address' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  findByWallet(@Param('walletAddress') walletAddress: string) {
    return this.userService.findByWallet(walletAddress);
  }

  @Post()
  @ApiOperation({ summary: 'Register or update user details by wallet address' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
  upsertUser(@Body() upsertUserDto: UpsertUserDto) {
    return this.userService.upsertUser(upsertUserDto);
  }
}
