import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, Restaurant } from '../../services/api';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-admin-restaurants',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-restaurants.html',
  styleUrl: './admin-restaurants.css'
})
export class AdminRestaurants {
  restaurants: Restaurant[] = [];
  selectedRestaurantId: number | null = null;

  name = '';
  address = '';
  imageUrl = '';
  latitude: number | null = null;
  longitude: number | null = null;

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
    this.api.getRestaurants(1, 100).subscribe({
      next: (res) => {
        this.restaurants = res.items;
      },
      error: () => {
        this.error = 'Could not load restaurants.';
      }
    });
  }

  onSelectRestaurant() {
    this.error = '';
    this.success = '';

    if (!this.selectedRestaurantId) {
      this.name = '';
      this.address = '';
      this.imageUrl = '';
      this.latitude = null;
      this.longitude = null;
      return;
    }

    const selected = this.restaurants.find(x => x.id === this.selectedRestaurantId);
    if (!selected) {
      this.error = 'Selected restaurant not found.';
      return;
    }

    this.name = selected.name;
    this.address = selected.address;
    this.imageUrl = selected.imageUrl || '';
    this.latitude = selected.latitude;
    this.longitude = selected.longitude;
  }

  saveRestaurant() {
    this.error = '';
    this.success = '';

    if (!this.name || !this.address || this.latitude === null || this.longitude === null) {
      this.error = 'All fields are required.';
      return;
    }

    const payload = {
      name: this.name,
      address: this.address,
      imageUrl: this.imageUrl || undefined,
      latitude: this.latitude,
      longitude: this.longitude
    };

    this.loading = true;

    const request$ = this.selectedRestaurantId
      ? this.api.updateRestaurant(this.selectedRestaurantId, payload)
      : this.api.createRestaurant(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.success = this.selectedRestaurantId
          ? 'Restaurant updated successfully.'
          : 'Restaurant added successfully.';

        this.name = '';
        this.address = '';
        this.imageUrl = '';
        this.latitude = null;
        this.longitude = null;
        this.selectedRestaurantId = null;
        this.loadRestaurants();
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;

        if (err.status === 401 || err.status === 403) {
          this.error = 'You are not authorized. Login as admin.';
        } else {
          this.error = 'Failed to add restaurant.';
        }
      }
    });
  }
}
