import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-orders',
  imports: [RouterLink],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class Orders implements OnInit {
  orders: any[] = [];
  selectedOrder: any = null;
  loading = true;
  detailsLoading = false;
  actionLoadingId: number | null = null;

  constructor(
    private api: Api,
    private auth: Auth,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      alert('Please login first.');
      this.router.navigate(['/login']);
      return;
    }

    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.api.getMyOrders().subscribe({
      next: (res) => {
        this.orders = res;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;

        if (err.status === 401) {
          alert('Session expired. Please login again.');
          this.router.navigate(['/login']);
        } else {
          alert('Could not load orders.');
        }
      }
    });
  }

  viewDetails(orderId: number) {
    this.detailsLoading = true;
    this.api.getOrderById(orderId).subscribe({
      next: (res) => {
        this.selectedOrder = res;
        this.detailsLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.detailsLoading = false;
        alert('Could not load order details.');
      }
    });
  }

  cancelOrder(orderId: number) {
    this.actionLoadingId = orderId;

    this.api.cancelOrder(orderId).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.loadOrders();

        if (this.selectedOrder?.id === orderId) {
          this.viewDetails(orderId);
        }
      },
      error: (err) => {
        console.error(err);
        this.actionLoadingId = null;
        alert(err?.error || 'Could not cancel order.');
      }
    });
  }

  canCancel(order: any): boolean {
    return order.status !== 'Delivered' && order.status !== 'Cancelled';
  }
}
