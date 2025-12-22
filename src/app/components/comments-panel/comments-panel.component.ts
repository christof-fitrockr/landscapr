import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Comment } from '../../models/comment';
import { AuthenticationService } from '../../services/authentication.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-comments-panel',
  templateUrl: './comments-panel.component.html',
  styleUrls: ['./comments-panel.component.scss']
})
export class CommentsPanelComponent {
  @Input() title: string;
  @Input() comments: Comment[] = [];
  @Output() commentsChange = new EventEmitter<Comment[]>();
  @Output() close = new EventEmitter<void>();

  newCommentText = '';
  editingCommentId: string | null = null;
  editingText = '';

  constructor(private authService: AuthenticationService) {}

  addComment() {
    if (!this.newCommentText.trim()) return;

    const user = this.authService.getCurrentUserValue();
    const username = user ? (user.displayName || user.username) : 'Anonymous';

    const newComment: Comment = {
      id: uuidv4(),
      timestamp: Date.now(),
      username: username,
      text: this.newCommentText.trim()
    };

    const updatedComments = [newComment, ...(this.comments || [])];
    this.commentsChange.emit(updatedComments);
    this.newCommentText = '';
  }

  startEdit(comment: Comment) {
    this.editingCommentId = comment.id;
    this.editingText = comment.text;
  }

  cancelEdit() {
    this.editingCommentId = null;
    this.editingText = '';
  }

  saveEdit(comment: Comment) {
    if (!this.editingText.trim()) return;

    const updatedComments = (this.comments || []).map(c => {
      if (c.id === comment.id) {
        return { ...c, text: this.editingText.trim() };
      }
      return c;
    });

    this.commentsChange.emit(updatedComments);
    this.cancelEdit();
  }

  deleteComment(comment: Comment) {
    if (confirm('Are you sure you want to delete this comment?')) {
      const updatedComments = (this.comments || []).filter(c => c.id !== comment.id);
      this.commentsChange.emit(updatedComments);
    }
  }
}
