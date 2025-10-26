<template>
  <div class="home">
    <h1>最新文章</h1>
    <div v-if="posts.length === 0" class="alert alert-info">
      暂无文章。
    </div>
    <div v-else>
      <div v-for="post in posts" :key="post.id" class="card mb-3">
        <div class="card-body">
          <h5 class="card-title"><router-link :to="`/posts/${post.id}`">{{ post.title }}</router-link></h5>
          <h6 class="card-subtitle mb-2 text-muted">作者: {{ post.author }} | 发布于: {{ new Date(post.createdAt).toLocaleDateString() }}</h6>
          <p class="card-text">{{ truncateContent(post.content) }}</p>
          <router-link :to="`/posts/${post.id}`" class="card-link">阅读更多</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'HomePage',
  data() {
    return {
      posts: []
    };
  },
  created() {
    this.fetchPosts();
  },
  methods: {
    async fetchPosts() {
      try {
        const response = await axios.get('http://localhost:3000/posts');
        this.posts = response.data.data;
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    },
    truncateContent(content) {
      const maxLength = 150;
      if (content.length > maxLength) {
        return content.substring(0, maxLength) + '...';
      }
      return content;
    }
  }
};
</script>
