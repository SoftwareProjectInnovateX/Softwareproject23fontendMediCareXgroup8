import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { FirebaseModule } from '../../shared/firebase/firebase.module.js';
import { MailService } from '../../shared/mail/mail.service.js';

@Module({
  imports: [FirebaseModule],
  controllers: [OrdersController],
  providers: [OrdersService, MailService],
})
export class OrdersModule {}
