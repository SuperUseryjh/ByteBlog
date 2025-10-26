<template>
  <div class="admin-dashboard">
    <h1>管理面板</h1>
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <a class="nav-link" :class="{ active: activeTab === 'posts' }" @click="activeTab = 'posts'" href="#">文章管理</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'" href="#">用户管理</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'" href="#">网站设置</a>
      </li>
    </ul>

    <div v-if="activeTab === 'posts'">
      <h2>文章管理</h2>
      <router-link to="/admin/posts/new" class="btn btn-primary mb-3">创建新文章</router-link>
      <div v-if="posts.length === 0" class="alert alert-info">
        暂无文章。
      </div>
      <div v-else>
        <table class="table table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>作者</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="post in posts" :key="post.id">
              <td>{{ post.id }}</td>
              <td>{{ post.title }}</td>
              <td>{{ post.author }}</td>
              <td>
                <router-link :to="`/admin/posts/edit/${post.id}`" class="btn btn-sm btn-warning me-2">编辑</router-link>
                <button @click="deletePost(post.id)" class="btn btn-sm btn-danger">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'users'">
      <h2>用户管理</h2>
      <div v-if="users.length === 0" class="alert alert-info">
        暂无用户。
      </div>
      <div v-else>
        <table class="table table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td>{{ user.role }}</td>
              <td>
                <!-- Add user edit/delete functionality here -->
                <button @click="deleteUser(user.id)" class="btn btn-sm btn-danger">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'settings'">
      <AdminSettings />
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import AdminSettings from '../components/AdminSettings.vue';

export default {
  name: 'AdminDashboard',
  components: {
    AdminSettings
  },
  data() {
    return {
      activeTab: 'posts',
      posts: [],
      users: []
    };
  },
  created() {
    this.fetchPosts();
    this.fetchUsers();
  },
  methods: {
    async fetchPosts() {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/posts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.posts = response.data.data;
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    },
    async deletePost(id) {
      if (confirm('确定要删除这篇文章吗？')) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`http://localhost:3000/posts/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          this.fetchPosts(); // Refresh the list
        } catch (error) {
          console.error('Error deleting post:', error);
          alert('删除文章失败。');
        }
      }
    },
    async fetchUsers() {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.users = response.data.data;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },
    async deleteUser(id) {
      if (confirm('确定要删除这个用户吗？')) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`http://localhost:3000/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          this.fetchUsers(); // Refresh the list
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('删除用户失败。');
        }
      }
    }
  }
};
</script>