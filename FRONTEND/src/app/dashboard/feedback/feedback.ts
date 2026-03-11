import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-feedback',
   standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class Feedback {

    feedbackForm: any = {
    name: '',
    email: '',
    mobile: '',
    user_type: '',
    message: ''
  };

  lastFeedback: any = null;

  constructor(private http: HttpClient) {}

  submitFeedback() {

    const api = 'http://127.0.0.1:4000/v1/api/feedback/create';

    this.http.post(api, this.feedbackForm).subscribe((res: any) => {

      if (res.status) {
        alert('Feedback submitted successfully');

        this.lastFeedback = res.data;

        this.feedbackForm = {
          name: '',
          email: '',
          mobile: '',
          user_type: '',
          message: ''
        };
      }

    });
  }


}
