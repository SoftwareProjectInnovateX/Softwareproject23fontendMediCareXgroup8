import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getAll() {
    return this.ordersService.getAllOrders();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Post()
  async create(@Body() orderData: any) {
    
    return await this.ordersService.createOrder(orderData);
  }
}
