<template>
  <div class="post-detail">
    <div v-if="post">
      <h1>{{ post.title }}</h1>
      <h6 class="text-muted">作者: {{ post.author }} | 发布于: {{ new Date(post.createdAt).toLocaleDateString() }}</h6>
      <hr>
      <div class="post-content" v-html="renderedContent"></div>

      <h3 class="mt-5">评论</h3>
      <div v-if="comments.length === 0" class="alert alert-info">
        暂无评论。
      </div>
      <div v-else>
        <div v-for="comment in comments" :key="comment.id" class="card mb-3">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">{{ comment.author }} 发表于 {{ new Date(comment.createdAt).toLocaleString() }}</h6>
            <p class="card-text">{{ comment.content }}</p>
          </div>
        </div>
      </div>

      <h4 class="mt-4">发表评论</h4>
      <form @submit.prevent="submitComment">
        <div class="mb-3">
          <label for="commentAuthor" class="form-label">你的名字 (可选)</label>
          <input type="text" class="form-control" id="commentAuthor" v-model="newComment.author">
        </div>
        <div class="mb-3">
          <label for="commentContent" class="form-label">评论内容</label>
          <textarea class="form-control" id="commentContent" rows="3" v-model="newComment.content" required></textarea>
        </div>
        <div v-if="commentError" class="alert alert-danger">{{ commentError }}</div>
        <button type="submit" class="btn btn-primary">提交评论</button>
      </form>

    </div>
    <div v-else class="alert alert-warning">
      文章未找到。
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { marked } from 'marked';

export default {
  name: 'PostDetail',
  props: ['id'],
  data() {
    return {
      post: null,
      renderedContent: '',
      comments: [],
      newComment: {
        author: '',
        content: ''
      },
      commentError: null
    };
  },
  async created() {
    await this.fetchPost();
    await this.fetchComments();
  },
  watch: {
    id: async function() {
      await this.fetchPost();
      await this.fetchComments();
    } // Watch for changes in id prop
  },
  methods: {
    async fetchPost() {
      try {
        const response = await axios.get(`http://localhost:3000/posts/${this.id}`);
        this.post = response.data.data;
        if (this.post) {
          this.renderedContent = marked(this.post.content);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        this.post = null;
      }
    },
    async fetchComments() {
      try {
        const response = await axios.get(`http://localhost:3000/posts/${this.id}/comments`);
        this.comments = response.data.data;
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    },
    async submitComment() {
      this.commentError = null;
      if (!this.newComment.content) {
        this.commentError = '评论内容不能为空。';
        return;
      }
      try {
        const authorName = this.newComment.author || '匿名用户';
        await axios.post(`http://localhost:3000/posts/${this.id}/comments`, {
          author: authorName,
          content: this.newComment.content
        });
        this.newComment.content = ''; // Clear comment input
        this.newComment.author = ''; // Clear author input
        await this.fetchComments(); // Refresh comments
      } catch (error) {
        this.commentError = error.response.data.error || '提交评论失败。';
        console.error('Error submitting comment:', error);
      }
    }
  }
};
</script>

<style scoped>
.post-content img {
  max-width: 100%;
  height: auto;
}
</style>
