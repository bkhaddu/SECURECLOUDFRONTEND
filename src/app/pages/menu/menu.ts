import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, FoodItem } from '../../services/api';

@Component({
  selector: 'app-menu',
  imports: [RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu implements OnInit {
  restaurantId = 0;
  foodItems: FoodItem[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: Api
  ) { }

  ngOnInit(): void {
    this.restaurantId = Number(this.route.snapshot.paramMap.get('restaurantId'));

    this.api.getFoodItems(this.restaurantId).subscribe({
      next: (res) => {
        this.foodItems = res;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        alert('Could not load menu.');
        this.loading = false;
      }
    });
  }

  addToCart(item: FoodItem) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existing = cart.find((x: any) => x.foodItemId === item.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        foodItemId: item.id,
        restaurantId: item.restaurantId,
        name: item.name,
        category: item.category,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity: 1
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`${item.name} added to cart.`);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }
}
