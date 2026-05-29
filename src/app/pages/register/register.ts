import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  fullName = '';
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: Auth, private router: Router) { }

  register() {
    this.error = '';

    if (!this.fullName || !this.email || !this.password) {
      this.error = 'All fields are required.';
      return;
    }

    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters.';
      return;
    }

    this.loading = true;

    this.auth.register({
      fullName: this.fullName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        try {
          this.auth.saveAuth(res);
          this.router.navigate(['/restaurants']);
        } catch {
          this.error = 'Registration succeeded but login data was invalid. Please login again.';
        } finally {
          this.loading = false;
        }
      },
      error: (err) => {
        console.error(err);
        this.error = err.error || 'Registration failed.';
        this.loading = false;
      }
    });
  }
}
