import { Routes } from '@angular/router';
import { Restaurants } from './pages/restaurants/restaurants';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Menu } from './pages/menu/menu';
import { Cart } from './pages/cart/cart';
import { Orders } from './pages/orders/orders';
import { Map } from './pages/map/map';
import { AdminRestaurants } from './pages/admin-restaurants/admin-restaurants';
import { AdminFoodItems } from './pages/admin-food-items/admin-food-items';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  { path: '', component: Restaurants },
  { path: 'restaurants', component: Restaurants },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'menu/:restaurantId', component: Menu },
  { path: 'cart', component: Cart, canActivate: [authGuard] },
  { path: 'orders', component: Orders, canActivate: [authGuard] },
  { path: 'map', component: Map, canActivate: [authGuard] },
  { path: 'map/:orderId', component: Map, canActivate: [authGuard] },

  { path: 'admin/restaurants', component: AdminRestaurants, canActivate: [adminGuard] },
  { path: 'admin/food-items', component: AdminFoodItems, canActivate: [adminGuard] },

  { path: '**', redirectTo: '' }
];
