import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role, User } from '../core/types';
import { AuthService } from '../core/auth.service';
@Component({selector:'app-users',standalone:true,imports:[CommonModule,FormsModule,DatePipe],template:`
  <div class="page-heading"><div><span class="eyebrow">ACCESS CONTROL</span><h1>User management</h1><p class="muted">Manage accounts, roles, and workspace access.</p></div><button class="primary-button" (click)="startCreate()">+ Add user</button></div>
  <p *ngIf="error()" class="error-notice">{{error()}}</p><p *ngIf="message()" class="success-notice">{{message()}}</p>
  <section class="surface panel"><div class="panel-header"><div><h2>Team members</h2><p>{{users().length}} registered accounts</p></div><span class="soft-tag">ADMIN ONLY</span></div>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
      <tr *ngFor="let user of users()"><td><b>{{user.full_name}}</b><span class="table-sub">{{user.email}}</span></td><td><span class="role-tag">{{user.role}}</span></td><td><span class="status-chip" [class.failed]="!user.is_active">{{user.is_active?'Active':'Disabled'}}</span></td><td>{{user.created_at | date:'mediumDate'}}</td><td class="action-cell"><button class="mini-button" (click)="startEdit(user)">Edit</button><button class="mini-button danger" [disabled]="user.id===auth.user()?.id" (click)="remove(user)">Delete</button></td></tr>
      <tr *ngIf="!users().length"><td colspan="5" class="empty-cell">No users found.</td></tr>
    </tbody></table></div>
  </section>
  <div class="modal-backdrop" *ngIf="showForm()" (click)="showForm.set(false)"><section class="modal surface" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="User editor">
    <div class="panel-header"><div><h2>{{editingId()?'Edit account':'Create account'}}</h2><p>Assign appropriate workspace permissions.</p></div><button class="icon-button" (click)="showForm.set(false)">✕</button></div>
    <form (ngSubmit)="save()" class="form-grid">
      <label>Full name<input name="full_name" [(ngModel)]="form.full_name" minlength="2" maxlength="160" required></label>
      <label>Email address<input name="email" [(ngModel)]="form.email" type="email" required></label>
      <label>Password <small>{{editingId()?'(leave blank to keep unchanged)':'(12+ characters)'}}</small><input name="password" [(ngModel)]="form.password" type="password" [required]="!editingId()" [minlength]="editingId()&&!form.password?0:12" autocomplete="new-password"></label>
      <label>Role<select name="role" [(ngModel)]="form.role"><option value="admin">Administrator</option><option value="operator">Operator</option><option value="viewer">Viewer</option></select></label>
      <label class="check-label"><input type="checkbox" name="is_active" [(ngModel)]="form.is_active"> Active account</label>
      <div class="modal-actions"><button type="button" class="secondary-button" (click)="showForm.set(false)">Cancel</button><button type="submit" class="primary-button" [disabled]="saving()">{{saving()?'Saving…':'Save user'}}</button></div>
    </form>
  </section></div>`})
export class UsersComponent implements OnInit {
  private http=inject(HttpClient);auth=inject(AuthService);
  users=signal<User[]>([]);showForm=signal(false);editingId=signal<number|null>(null);
  error=signal('');message=signal('');saving=signal(false);
  form:{email:string;full_name:string;password:string;role:Role;is_active:boolean}={email:'',full_name:'',password:'',role:'operator',is_active:true};
  ngOnInit(){this.reload();}
  reload(){this.http.get<User[]>('/api/users').subscribe({next:x=>this.users.set(x),error:()=>this.error.set('Unable to load users')});}
  startCreate(){this.error.set('');this.message.set('');this.form={email:'',full_name:'',password:'',role:'operator',is_active:true};this.editingId.set(null);this.showForm.set(true);}
  startEdit(u:User){this.error.set('');this.message.set('');this.form={email:u.email,full_name:u.full_name,password:'',role:u.role,is_active:u.is_active};this.editingId.set(u.id);this.showForm.set(true);}
  save(){this.saving.set(true);this.error.set('');const payload:any={...this.form};if(this.editingId()&&!payload.password)delete payload.password;
    const call=this.editingId()?this.http.patch<User>(`/api/users/${this.editingId()}`,payload):this.http.post<User>('/api/users',payload);
    call.subscribe({next:()=>{this.saving.set(false);this.showForm.set(false);this.message.set('User account saved.');this.reload();},error:e=>{this.saving.set(false);this.error.set(e.error?.detail || 'Could not save user');}});
  }
  remove(user:User){if(!confirm(`Delete account ${user.email}? This cannot be undone.`))return;this.error.set('');this.http.delete(`/api/users/${user.id}`).subscribe({next:()=>{this.message.set('Account deleted.');this.reload();},error:e=>this.error.set(e.error?.detail || 'Could not delete user')});}
}
