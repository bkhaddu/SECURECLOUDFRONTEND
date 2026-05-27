import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../services/api';

declare var google: any;

@Component({
  selector: 'app-map',
  imports: [RouterLink],
  templateUrl: './map.html',
  styleUrl: './map.css'
})
export class Map implements AfterViewInit, OnDestroy {
  orderId = 0;
  tracking: any = null;
  error = '';
  etaText = '';

  googleMapsKey = '';
  map: any;
  directionsService: any;
  directionsRenderer: any;
  deliveryMarker: any;
  refreshTimer: any = null;

  constructor(
    private route: ActivatedRoute,
    private api: Api
  ) { }

  ngAfterViewInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('orderId'));

    if (!this.orderId) {
      this.error = 'No order selected. Open tracking from My Orders page.';
      return;
    }

    this.api.getPublicConfig().subscribe({
      next: (config) => {
        this.googleMapsKey = config.googleMapsBrowserKey || '';

        this.loadGoogleMapsScript()
          .then(() => {
            this.loadTracking();
            this.startAutoRefresh();
          })
          .catch(() => {
            this.error = 'Google Maps failed to load. Check API key and enabled APIs.';
          });
      },
      error: () => {
        this.error = 'Could not load map configuration.';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.loadTracking(true);
    }, 15000);
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

  loadTracking(silent = false): void {
    this.api.getTracking(this.orderId).subscribe({
      next: (res: any) => {
        const firstLoad = this.tracking === null;
        this.tracking = res;

        if (firstLoad) {
          this.initMap();
        } else {
          this.refreshMapFromTracking();
        }
      },
      error: (err: any) => {
        console.error(err);
        if (!silent) {
          if (err.status === 404) {
            this.error = 'Tracking not found. Complete payment first.';
          } else if (err.status === 401) {
            this.error = 'Please login again.';
          } else {
            this.error = 'Could not load tracking.';
          }
        }
      }
    });
  }

  initMap(): void {
    const pickup = {
      lat: Number(this.tracking.pickupLatitude),
      lng: Number(this.tracking.pickupLongitude)
    };

    const drop = {
      lat: Number(this.tracking.dropLatitude),
      lng: Number(this.tracking.dropLongitude)
    };

    const current = {
      lat: Number(this.tracking.currentLatitude),
      lng: Number(this.tracking.currentLongitude)
    };

    this.map = new google.maps.Map(document.getElementById('map'), {
      center: current,
      zoom: 13
    });

    this.directionsService = new google.maps.DirectionsService();

    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: false
    });

    new google.maps.Marker({
      position: pickup,
      map: this.map,
      title: 'Restaurant Pickup'
    });

    new google.maps.Marker({
      position: drop,
      map: this.map,
      title: 'Customer Drop Location'
    });

    this.deliveryMarker = new google.maps.Marker({
      position: current,
      map: this.map,
      title: 'Delivery Partner Current Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    });

    this.drawRoute(current, drop);
  }

  refreshMapFromTracking(): void {
    if (!this.map || !this.deliveryMarker || !this.tracking) {
      return;
    }

    const current = {
      lat: Number(this.tracking.currentLatitude),
      lng: Number(this.tracking.currentLongitude)
    };

    const drop = {
      lat: Number(this.tracking.dropLatitude),
      lng: Number(this.tracking.dropLongitude)
    };

    this.deliveryMarker.setPosition(current);
    this.map.setCenter(current);
    this.drawRoute(current, drop);
  }

  drawRoute(origin: any, destination: any): void {
    this.directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
      },
      (response: any, status: any) => {
        if (status === 'OK') {
          this.directionsRenderer.setDirections(response);
          const leg = response?.routes?.[0]?.legs?.[0];
          this.etaText = leg?.duration?.text || '';
        } else {
          console.error('Directions failed:', status);
          this.error = 'Route could not be drawn. Check Directions API.';
          this.etaText = '';
        }
      }
    );
  }

  simulateNextStep(): void {
    if (!this.tracking) {
      return;
    }

    const dropLat = Number(this.tracking.dropLatitude);
    const dropLng = Number(this.tracking.dropLongitude);

    let currentLat = Number(this.tracking.currentLatitude);
    let currentLng = Number(this.tracking.currentLongitude);

    currentLat = currentLat + (dropLat - currentLat) * 0.25;
    currentLng = currentLng + (dropLng - currentLng) * 0.25;

    let status = 'Out for Delivery';

    const distance = Math.abs(dropLat - currentLat) + Math.abs(dropLng - currentLng);

    if (distance < 0.002) {
      currentLat = dropLat;
      currentLng = dropLng;
      status = 'Delivered';
    }

    const payload = {
      orderId: this.orderId,
      currentLatitude: currentLat,
      currentLongitude: currentLng,
      status: status
    };

    this.api.updateTracking(payload).subscribe({
      next: (_res: any) => {
        this.loadTracking(true);
      },
      error: (err: any) => {
        console.error(err);
        alert('Could not update tracking.');
      }
    });
  }
}
