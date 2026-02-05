import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  username = '';
  password = '';
  loading = false;
  error = '';
showPassword: any;

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

 login() {
  console.log('LOGIN CLICKED');

  this.loading = true;
  this.error = '';

  this.auth.login2(this.username, this.password).subscribe({
    next: (res: any) => {
      console.log('LOGIN NEXT:', res);

      this.loading = false;

      if (res && res.success) {
        this.router.navigateByUrl('/dashboard');
      } else {
        this.error = res?.error || 'Invalid user ID or password';
      }
    },
    error: (err) => {
      console.error('LOGIN ERROR:', err);
      this.loading = false;
      this.error = 'Server error during login';
    }
  });
}

}
