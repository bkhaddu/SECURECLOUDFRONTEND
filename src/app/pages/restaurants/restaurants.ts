import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api, Restaurant } from '../../services/api';
import { Auth } from '../../services/auth';
import { retry, timeout } from 'rxjs/operators';

declare var google: any;

@Component({
  selector: 'app-restaurants',
  imports: [RouterLink, FormsModule],
  templateUrl: './restaurants.html',
  styleUrl: './restaurants.css'
})
export class Restaurants implements OnInit {
  restaurants: Restaurant[] = [];
  allRestaurants: Restaurant[] = [];
  searchTerm = '';
  searchError = '';
  activeSearch = '';

  locationText = '';
  locationError = '';
  googleMapsKey = '';
  selectedLatitude: number | null = null;
  selectedLongitude: number | null = null;
  readonly radiusKm = 30;
  showLocationPanel = false;
  private locationAutocompleteReady = false;

  categories = [
    { name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=240&q=80' },
    { name: 'Burger', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=240&q=80' },
    { name: 'Biryani', image: 'https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?auto=format&fit=crop&w=240&q=80' },
    { name: 'Chicken', image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=240&q=80' },
    { name: 'Veg Meal', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=240&q=80' },
    { name: 'Rolls', image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=240&q=80' }
  ];

  fullName = '';
  isAdmin = false;
  loading = true;

  constructor(private api: Api, private auth: Auth) { }

  ngOnInit(): void {
    this.fullName = this.auth.getFullName();
    this.isAdmin = this.auth.isAdmin();
    this.loadRestaurants();
    this.loadLocationConfig();
  }

  loadRestaurants(search = '') {
    this.loading = true;
    this.searchError = '';

    this.api.getRestaurants(1, 60, search).pipe(
      timeout(20000),
      retry({ count: 1, delay: 800 })
    ).subscribe({
      next: (res) => {
        this.allRestaurants = res.items;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Restaurant API error:', err);
        this.searchError = 'Could not load restaurants. Please try again.';
        this.loading = false;
      }
    });
  }

  searchRestaurants() {
    this.activeSearch = this.searchTerm.trim();
    this.loadRestaurants(this.activeSearch);
  }

  onSearchInput() {
    this.activeSearch = this.searchTerm.trim();
    this.applyFilters();
  }

  onCategorySelect(categoryName: string) {
    this.searchTerm = categoryName;
    this.searchRestaurants();
  }

  clearSearch() {
    if (!this.searchTerm.trim()) {
      return;
    }

    this.searchTerm = '';
    this.activeSearch = '';
    this.loadRestaurants();
  }

  loadLocationConfig() {
    this.api.getPublicConfig().subscribe({
      next: (config) => {
        this.googleMapsKey = config.googleMapsBrowserKey || '';
        this.loadGoogleMapsScript()
          .then(() => this.initLocationAutocomplete())
          .catch(() => {
            this.locationError = 'Google Maps location is unavailable right now.';
          });
      },
      error: () => {
        this.locationError = 'Could not load location service.';
      }
    });
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if ((window as any).google && (window as any).google.maps) {
        resolve();
        return;
      }

      if (!this.googleMapsKey || this.googleMapsKey.includes('YOUR_')) {
        reject();
        return;
      }

      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject());
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }

  initLocationAutocomplete() {
    const input = document.getElementById('top-location-input') as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ['address_components', 'formatted_address', 'geometry'],
      types: ['geocode'],
      componentRestrictions: { country: 'in' }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        this.locationError = 'Please choose a location from suggestions.';
        return;
      }

      this.locationText = place.formatted_address || this.locationText;
      this.selectedLatitude = place.geometry.location.lat();
      this.selectedLongitude = place.geometry.location.lng();
      this.locationError = '';
      this.saveSelectedLocation(place);
      this.applyFilters();
    });

    this.locationAutocompleteReady = true;
  }

  clearLocation() {
    this.locationText = '';
    this.selectedLatitude = null;
    this.selectedLongitude = null;
    this.locationError = '';
    localStorage.removeItem('selectedDeliveryLocation');
    this.applyFilters();
  }

  toggleLocationPanel() {
    this.showLocationPanel = !this.showLocationPanel;
    if (this.showLocationPanel && !this.locationAutocompleteReady) {
      setTimeout(() => this.initLocationAutocomplete());
    }
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.locationError = 'Current location is not available in this browser.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.selectedLatitude = position.coords.latitude;
        this.selectedLongitude = position.coords.longitude;
        this.locationText = 'Current location';
        this.locationError = '';
        localStorage.setItem('selectedDeliveryLocation', JSON.stringify({
          address: this.locationText,
          latitude: this.selectedLatitude,
          longitude: this.selectedLongitude
        }));
        this.applyFilters();
      },
      () => {
        this.locationError = 'Could not read your current location.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  private saveSelectedLocation(place: any) {
    const components = place.address_components || [];
    const getComponent = (type: string, shortName = false): string => {
      const component = components.find((c: any) => c.types.includes(type));
      return component ? (shortName ? component.short_name : component.long_name) : '';
    };

    localStorage.setItem('selectedDeliveryLocation', JSON.stringify({
      address: place.formatted_address || this.locationText,
      city: getComponent('locality') || getComponent('administrative_area_level_3') || getComponent('administrative_area_level_2'),
      state: getComponent('administrative_area_level_1', true),
      postalCode: getComponent('postal_code'),
      country: getComponent('country'),
      latitude: this.selectedLatitude,
      longitude: this.selectedLongitude
    }));
  }

  private applyFilters() {
    const normalized = this.searchTerm.trim().toLowerCase();

    this.restaurants = this.allRestaurants.filter((restaurant) => {
      const textMatch = !normalized
        || `${restaurant.name} ${restaurant.address} ${this.getRestaurantDescription(restaurant.name)}`.toLowerCase().includes(normalized);

      if (!textMatch) {
        return false;
      }

      if (this.selectedLatitude === null || this.selectedLongitude === null) {
        return true;
      }

      const distance = this.distanceKm(
        this.selectedLatitude,
        this.selectedLongitude,
        Number(restaurant.latitude),
        Number(restaurant.longitude)
      );

      return distance <= this.radiusKm;
    });
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => value * (Math.PI / 180);
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
      * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  logout() {
    this.auth.logout();
    location.reload();
  }

  getRestaurantImage(name: string): string {
    const brandLogoMap: Record<string, string> = {
      'Subway': 'https://logo.clearbit.com/subway.com',
      'Pizza Hut': 'https://logo.clearbit.com/pizzahut.com',
      "Domino's Pizza": 'https://logo.clearbit.com/dominos.co.in',
      'KFC': 'https://logo.clearbit.com/kfc.com',
      "McDonald's": 'https://logo.clearbit.com/mcdonalds.com',
      'Burger King': 'https://logo.clearbit.com/burgerking.in',
      'Taco Bell': 'https://logo.clearbit.com/tacobell.com',
      'Nando\'s': 'https://logo.clearbit.com/nandos.com',
      'Starbucks': 'https://logo.clearbit.com/starbucks.com',
      'Costa Coffee': 'https://logo.clearbit.com/costa.co.uk',
      'Cafe Coffee Day': 'https://logo.clearbit.com/cafecoffeeday.com',
      'Baskin Robbins': 'https://logo.clearbit.com/baskinrobbins.com'
    };

    if (brandLogoMap[name]) {
      return brandLogoMap[name];
    }

    return this.getInteriorFallbackImage(name);
  }

  getInteriorFallbackImage(name: string): string {
    const interiorImages = [
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=480&q=70',
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=480&q=70',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=480&q=70',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=480&q=70',
      'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=480&q=70'
    ];

    const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return interiorImages[hash % interiorImages.length];
  }

  onRestaurantImageError(event: Event, name: string) {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    target.onerror = null;
    target.src = this.getInteriorFallbackImage(name);
  }

  getRestaurantDescription(name: string): string {
    const descriptionMap: Record<string, string> = {
      'Biryani Blues': 'Signature dum biryanis, kebab platters, and comforting North Indian classics.',
      "Haldiram's": 'Pure vegetarian favorites, chaat specials, and family-style thali combinations.',
      'Wow! Momo': 'Steamed and pan-fried momos, bowls, and quick bites with bold sauces.',
      Keventers: 'Milkshakes, coolers, and snack pairings for a quick and easy treat.',
      'Barbeque Nation': 'Live grill experience with starters, buffet mains, and indulgent desserts.'
    };

    return descriptionMap[name] || 'Popular neighborhood kitchen with top-rated dishes and fast delivery.';
  }
}
