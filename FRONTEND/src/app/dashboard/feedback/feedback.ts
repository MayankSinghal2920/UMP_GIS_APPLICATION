import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from 'src/app/services/api';

@Component({
  selector: 'app-feedback',
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
    message: '',
  };

  lastFeedback: any = null;

  user_id: any= Number
  message: any= ''
  user_name: any= ''
  user_type: any= ''
  mobile: any= ''
  email: any= ''

  constructor(private api: Api, private cd: ChangeDetectorRef) {
     this.user_id = localStorage.getItem('user_id');
     this.user_name= localStorage.getItem('user_name')
     this.user_type= localStorage.getItem('user_type')
  }

  submitFeedback() {
    let data = {
      user_id: this.user_id,
      message: this.message,
    };

    this.api.addFeedBack(data).subscribe((res: any) => {
      if (res.status) {

        this.lastFeedback = res.data;
      }
      else{
        alert('feedback not added')
      }
       this.message= ''
      this.cd.detectChanges(); 
    });
  }

 
}
