import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';
import { retry, timeout } from 'rxjs/operators';

declare var Razorpay: any;
declare var google: any;

@Component({
  selector: 'app-cart',
  imports: [RouterLink, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart implements OnInit, AfterViewInit {
  cart: any[] = [];
  total = 0;
  loading = false;

  deliveryAddress = '';
  deliveryCity = '';
  deliveryState = '';
  deliveryPostalCode = '';
  deliveryCountry = '';
  deliveryLatitude: number | null = null;
  deliveryLongitude: number | null = null;

  googleMapsKey = '';
  addressSelected = false;
  map: any;
  marker: any;
  readonly maxDeliveryDistanceKm = 30;
  deliveryDistanceKm: number | null = null;

  constructor(
    private api: Api,
    private auth: Auth,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCart();
    this.loadSavedDeliveryLocation();
  }

  ngAfterViewInit(): void {
    this.api.getPublicConfig().subscribe({
      next: (config) => {
        this.googleMapsKey = config.googleMapsBrowserKey || '';

        this.loadGoogleMapsScript()
          .then(() => this.initAddressAutocomplete())
          .catch(() => {
            console.error('Google Maps failed to load. Check browser key and enabled Places API.');
          });
      },
      error: () => {
        console.error('Failed to load public config for maps.');
      }
    });
  }

  loadCart() {
    this.cart = JSON.parse(localStorage.getItem('cart') || '[]');
    this.total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  increase(item: any) {
    item.quantity += 1;
    this.saveCart();
  }

  decrease(item: any) {
    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      this.remove(item);
      return;
    }

    this.saveCart();
  }

  remove(item: any) {
    this.cart = this.cart.filter(x => x.foodItemId !== item.foodItemId);
    this.saveCart();
  }

  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.cart));
    this.loadCart();
  }

  clearCart() {
    localStorage.removeItem('cart');
    this.loadCart();
  }

  loadSavedDeliveryLocation(): void {
    const savedLocation = localStorage.getItem('selectedDeliveryLocation');
    if (!savedLocation) {
      return;
    }

    try {
      const location = JSON.parse(savedLocation);
      this.deliveryAddress = location.address || this.deliveryAddress;
      this.deliveryCity = location.city || this.deliveryCity;
      this.deliveryState = location.state || this.deliveryState;
      this.deliveryPostalCode = location.postalCode || this.deliveryPostalCode;
      this.deliveryCountry = location.country || this.deliveryCountry;
      this.deliveryLatitude = Number.isFinite(Number(location.latitude)) ? Number(location.latitude) : this.deliveryLatitude;
      this.deliveryLongitude = Number.isFinite(Number(location.longitude)) ? Number(location.longitude) : this.deliveryLongitude;
      this.addressSelected = this.deliveryLatitude !== null && this.deliveryLongitude !== null;
    } catch {
      localStorage.removeItem('selectedDeliveryLocation');
    }
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

  initAddressAutocomplete(): void {
    const input = document.getElementById('location-input') as HTMLInputElement;

    if (!input) {
      return;
    }

    const defaultLocation = {
      lat: 28.6139,
      lng: 77.2090
    };

    const mapElement = document.getElementById('address-map');

    if (mapElement) {
      this.map = new google.maps.Map(mapElement, {
        center: defaultLocation,
        zoom: 12
      });

      this.marker = new google.maps.Marker({
        position: defaultLocation,
        map: this.map,
        title: 'Delivery Location'
      });
    }

    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ['address_components', 'geometry', 'name', 'formatted_address'],
      types: ['address'],
      componentRestrictions: { country: 'in' }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.geometry.location) {
        alert(`No details available for input: ${place.name}`);
        return;
      }

      this.fillAddress(place);
      this.renderAddress(place);
      this.addressSelected = true;
      this.saveDeliveryLocation();
    });
  }

  fillAddress(place: any): void {
    const components = place.address_components || [];

    const getComponent = (type: string, shortName = false): string => {
      const component = components.find((c: any) => c.types.includes(type));
      if (!component) {
        return '';
      }

      return shortName ? component.short_name : component.long_name;
    };

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');

    this.deliveryAddress = place.formatted_address || `${streetNumber} ${route}`.trim();
    this.deliveryCity =
      getComponent('locality') ||
      getComponent('administrative_area_level_3') ||
      getComponent('administrative_area_level_2');

    this.deliveryState = getComponent('administrative_area_level_1', true);
    this.deliveryPostalCode = getComponent('postal_code');
    this.deliveryCountry = getComponent('country');

    this.deliveryLatitude = place.geometry.location.lat();
    this.deliveryLongitude = place.geometry.location.lng();
  }

  saveDeliveryLocation(): void {
    localStorage.setItem('selectedDeliveryLocation', JSON.stringify({
      address: this.deliveryAddress,
      city: this.deliveryCity,
      state: this.deliveryState,
      postalCode: this.deliveryPostalCode,
      country: this.deliveryCountry,
      latitude: this.deliveryLatitude,
      longitude: this.deliveryLongitude
    }));
  }

  renderAddress(place: any): void {
    if (!this.map || !this.marker || !place.geometry?.location) {
      return;
    }

    const location = place.geometry.location;

    this.map.setCenter(location);
    this.map.setZoom(16);
    this.marker.setPosition(location);
  }

  checkout() {
    if (!this.auth.isLoggedIn()) {
      alert('Please login first.');
      this.router.navigate(['/login']);
      return;
    }

    if (this.cart.length === 0) {
      alert('Cart is empty.');
      return;
    }

    if (!this.deliveryAddress || !this.deliveryCity || !this.deliveryState || !this.deliveryPostalCode || !this.deliveryCountry) {
      alert('Please select a complete delivery address before payment.');
      return;
    }

    if (this.deliveryLatitude === null || this.deliveryLongitude === null) {
      alert('Please select address from Google suggestions so location can be tracked.');
      return;
    }

    const restaurantId = this.cart[0].restaurantId;

    const hasDifferentRestaurant = this.cart.some(x => x.restaurantId !== restaurantId);

    if (hasDifferentRestaurant) {
      alert('Please order from one restaurant at a time.');
      return;
    }

    const payload = {
      restaurantId: restaurantId,
      items: this.cart.map(x => ({
        foodItemId: x.foodItemId,
        quantity: x.quantity
      })),

      deliveryAddress: this.deliveryAddress,
      deliveryCity: this.deliveryCity,
      deliveryState: this.deliveryState,
      deliveryPostalCode: this.deliveryPostalCode,
      deliveryCountry: this.deliveryCountry,
      deliveryLatitude: this.deliveryLatitude,
      deliveryLongitude: this.deliveryLongitude
    };

    this.loading = true;
    this.validateDeliveryDistanceAndCreateOrder(restaurantId, payload);
  }

  validateDeliveryDistanceAndCreateOrder(restaurantId: number, payload: unknown): void {
    this.api.getRestaurants(1, 100, '').pipe(
      timeout(20000),
      retry({ count: 1, delay: 800 })
    ).subscribe({
      next: (res) => {
        const restaurant = res.items.find((item) => item.id === restaurantId);

        if (!restaurant) {
          this.loading = false;
          alert('Could not validate restaurant location. Please try again.');
          return;
        }

        this.deliveryDistanceKm = this.distanceKm(
          Number(restaurant.latitude),
          Number(restaurant.longitude),
          Number(this.deliveryLatitude),
          Number(this.deliveryLongitude)
        );

        if (this.deliveryDistanceKm > this.maxDeliveryDistanceKm) {
          this.loading = false;
          alert(`Delivery address is ${this.deliveryDistanceKm.toFixed(1)} km from ${restaurant.name}. Orders are allowed only within ${this.maxDeliveryDistanceKm} km.`);
          return;
        }

        this.createOrder(payload);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        alert('Could not validate delivery distance. Please try again.');
      }
    });
  }

  createOrder(payload: unknown): void {
    this.api.createOrder(payload).subscribe({
      next: (orderResponse) => {
        this.loading = false;
        this.openRazorpay(orderResponse);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;

        if (err.status === 401) {
          alert('Session expired. Please login again.');
          this.router.navigate(['/login']);
        } else {
          alert('Order creation failed.');
        }
      }
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

  openRazorpay(orderResponse: any) {
    const options = {
      key: orderResponse.razorpayKeyId,
      amount: orderResponse.amount * 100,
      currency: orderResponse.currency,
      name: 'SecureCloud Eats',
      description: 'Food Order Payment',
      order_id: orderResponse.razorpayOrderId,
      handler: (response: any) => {
        this.verifyPayment(orderResponse.localOrderId, response);
      },
      prefill: {
        name: sessionStorage.getItem('fullName') || '',
        email: sessionStorage.getItem('email') || ''
      },
      theme: {
        color: '#f97316'
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
  }

  verifyPayment(localOrderId: number, response: any) {
    const payload = {
      localOrderId: localOrderId,
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    };

    this.api.verifyPayment(payload).subscribe({
      next: () => {
        localStorage.removeItem('cart');
        alert('Payment successful. Order placed.');
        this.router.navigate(['/orders']);
      },
      error: (err) => {
        console.error(err);
        alert('Payment verification failed.');
      }
    });
  }
}
