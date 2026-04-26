import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../../shared/firebase/firebase.service.js';
import { MailService } from '../../shared/mail/mail.service.js';
@Injectable()
export class OrdersService {
  constructor(private readonly firebaseService: FirebaseService, private readonly mailService: MailService) {}

  async getAllOrders() {
    const db = this.firebaseService.getDb();
    const snapshot = await db
      .collection('orders')
      .orderBy('date', 'desc')
      .get();
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async getOrderById(id: string) {
    const db = this.firebaseService.getDb();
    const docSnap = await db.collection('orders').doc(id).get();
    if (!docSnap.exists) throw new NotFoundException('Order not found');
    return { id: docSnap.id, ...docSnap.data() };
  }

  async createOrder(orderPayload: any) {
    try {
      const db = this.firebaseService.getDb();
      const currentTimestamp = new Date().toISOString();

      const orderData = {
        ...orderPayload,
        date: currentTimestamp,
        createdAt: currentTimestamp
      };

      const docRef = await db.collection('orders').add(orderData);
      
      try {
        await this.mailService.sendInvoiceRole(orderData.email, orderData);
        console.log("✅ Invoice email sent successfully to:", orderData.email);
      } catch (mailError) {
        console.error("❌ Email sending failed but order was saved:", mailError.message);
      }

      return { 
        id: docRef.id, 
        ...orderData 
      };
    } catch (error) {
      
      throw new InternalServerErrorException(`Order creation failed: ${error.message}`);
    }
  }

  
}
