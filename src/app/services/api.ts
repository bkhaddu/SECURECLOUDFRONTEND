import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Restaurant {
  id: number;
  name: string;
  address: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
}

export interface FoodItem {
  id: number;
  restaurantId: number;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
}

export interface PagedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface PublicConfig {
  googleMapsBrowserKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class Api {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  getPublicConfig() {
    return this.http.get<PublicConfig>(`${this.baseUrl}/publicconfig`);
  }

  getRestaurants(page = 1, pageSize = 50, search = '') {
    const query = `?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`;
    return this.http.get<PagedResponse<Restaurant>>(`${this.baseUrl}/restaurants${query}`);
  }

  createRestaurant(payload: { name: string; address: string; imageUrl?: string; latitude: number; longitude: number }) {
    return this.http.post<Restaurant>(`${this.baseUrl}/restaurants`, payload);
  }

  updateRestaurant(id: number, payload: { name: string; address: string; imageUrl?: string; latitude: number; longitude: number }) {
    return this.http.put<Restaurant>(`${this.baseUrl}/restaurants/${id}`, payload);
  }

  deactivateRestaurant(id: number) {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/restaurants/${id}`);
  }

  getFoodItems(restaurantId: number, search = '', category = '') {
    const query = `?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
    return this.http.get<FoodItem[]>(`${this.baseUrl}/fooditems/restaurant/${restaurantId}${query}`);
  }

  createFoodItem(payload: { restaurantId: number; name: string; category: string; price: number; imageUrl?: string }) {
    return this.http.post<FoodItem>(`${this.baseUrl}/fooditems`, payload);
  }

  updateFoodItem(id: number, payload: { restaurantId: number; name: string; category: string; price: number; imageUrl?: string }) {
    return this.http.put<FoodItem>(`${this.baseUrl}/fooditems/${id}`, payload);
  }

  deactivateFoodItem(id: number) {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/fooditems/${id}`);
  }

  createOrder(payload: unknown) {
    return this.http.post<any>(`${this.baseUrl}/orders/create`, payload);
  }

  verifyPayment(payload: unknown) {
    return this.http.post<any>(`${this.baseUrl}/orders/verify-payment`, payload);
  }

  getMyOrders() {
    return this.http.get<any[]>(`${this.baseUrl}/orders/my-orders`);
  }

  getOrderById(orderId: number) {
    return this.http.get<any>(`${this.baseUrl}/orders/${orderId}`);
  }

  cancelOrder(orderId: number) {
    return this.http.post<any>(`${this.baseUrl}/orders/${orderId}/cancel`, {});
  }

  getTracking(orderId: number) {
    return this.http.get<any>(`${this.baseUrl}/tracking/${orderId}`);
  }

  updateTracking(payload: unknown) {
    return this.http.put<any>(`${this.baseUrl}/tracking/update`, payload);
  }
}
