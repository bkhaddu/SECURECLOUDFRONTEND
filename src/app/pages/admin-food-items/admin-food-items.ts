import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, Restaurant } from '../../services/api';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-admin-food-items',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-food-items.html',
  styleUrl: './admin-food-items.css'
})
export class AdminFoodItems implements OnInit {
  restaurants: Restaurant[] = [];

  restaurantId: number | null = null;
  name = '';
  category = '';
  price: number | null = null;
  imageUrl = '';

  error = '';
  success = '';
  loading = false;

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

    if (!this.auth.isAdmin()) {
      alert('Only admin can access this page.');
      this.router.navigate(['/restaurants']);
      return;
    }

    this.loadRestaurants();
  }

  loadRestaurants() {
    this.api.getRestaurants().subscribe({
      next: (res) => {
        this.restaurants = res.items;
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Could not load restaurants.';
      }
    });
  }

  addFoodItem() {
    this.error = '';
    this.success = '';

    if (!this.restaurantId || !this.name || !this.category || this.price === null) {
      this.error = 'Restaurant, name, category, and price are required.';
      return;
    }

    const payload = {
      restaurantId: Number(this.restaurantId),
      name: this.name,
      category: this.category,
      price: Number(this.price),
      imageUrl: this.imageUrl
    };

    this.loading = true;

    this.api.createFoodItem(payload).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Menu item added successfully.';

        this.name = '';
        this.category = '';
        this.price = null;
        this.imageUrl = '';
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;

        if (err.status === 401 || err.status === 403) {
          this.error = 'You are not authorized. Login as admin.';
        } else {
          this.error = 'Failed to add menu item.';
        }
      }
    });
  }
}

