import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  fullName: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  register(data: RegisterRequest) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, data);
  }

  login(data: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, data);
  }

  saveAuth(response: AuthResponse) {
    sessionStorage.setItem('token', response.token);
    sessionStorage.setItem('fullName', response.fullName);
    sessionStorage.setItem('email', response.email);
    sessionStorage.setItem('role', response.role);
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getFullName(): string {
    return sessionStorage.getItem('fullName') || '';
  }

  getRole(): string {
    return sessionStorage.getItem('role') || '';
  }

  isAdmin(): boolean {
    return this.getRole() === 'Admin';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    sessionStorage.clear();
  }
}
