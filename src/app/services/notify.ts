import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Notify {
  info(message: string) {
    window.alert(message);
  }

  error(message: string) {
    window.alert(message);
  }

  success(message: string) {
    window.alert(message);
  }
}
