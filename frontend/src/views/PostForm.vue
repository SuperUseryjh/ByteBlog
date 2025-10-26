<template>
  <div class="post-form">
    <h1>{{ isEditMode ? '编辑文章' : '创建新文章' }}</h1>
    <form @submit.prevent="submitForm">
      <div class="mb-3">
        <label for="title" class="form-label">标题</label>
        <input type="text" class="form-control" id="title" v-model="post.title" required>
      </div>
      <div class="mb-3">
        <label for="content" class="form-label">内容 (Markdown)</label>
        <textarea class="form-control" id="content" rows="10" v-model="post.content" required></textarea>
      </div>
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <button type="submit" class="btn btn-primary">{{ isEditMode ? '更新文章' : '创建文章' }}</button>
      <router-link to="/admin" class="btn btn-secondary ms-2">取消</router-link>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'PostForm',
  props: ['id'],
  data() {
    return {
      post: {
        title: '',
        content: ''
      },
      isEditMode: false,
      error: null
    };
  },
  created() {
    if (this.id) {
      this.isEditMode = true;
      this.fetchPost();
    }
  },
  methods: {
    async fetchPost() {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3000/posts/${this.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.post = response.data.data;
      } catch (error) {
        console.error('Error fetching post for edit:', error);
        this.error = '加载文章失败。';
      }
    },
    async submitForm() {
      try {
        const token = localStorage.getItem('token');
        if (this.isEditMode) {
          await axios.put(`http://localhost:3000/posts/${this.id}`, this.post, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          await axios.post('http://localhost:3000/posts', this.post, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        this.$router.push('/admin');
      } catch (error) {
        this.error = error.response.data.message || '操作失败';
        console.error('Form submission error:', error);
      }
    }
  }
};
</script>
