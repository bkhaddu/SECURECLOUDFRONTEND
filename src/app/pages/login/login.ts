import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: Auth, private router: Router) { }

  login() {
    this.error = '';

    if (!this.email || !this.password) {
      this.error = 'Email and password are required.';
      return;
    }

    this.loading = true;

    this.auth.login({
      email: this.email,
      password: this.password
    }).pipe(
      timeout(20000)
    ).subscribe({
      next: (res) => {
        try {
          this.auth.saveAuth(res);
          this.router.navigate(['/restaurants']);
        } catch {
          this.error = 'Login failed due to an unexpected server response.';
        } finally {
          this.loading = false;
        }
      },
      error: (err) => {
        console.error(err);
        this.error = err?.name === 'TimeoutError'
          ? 'Login is taking too long. Please try again in a moment.'
          : err?.error?.message || err?.error || 'Invalid email or password.';
        this.loading = false;
      }
    });
  }
}
