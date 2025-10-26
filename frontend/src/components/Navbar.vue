<template>
  <nav class="navbar navbar-expand-lg" :style="navbarStyle">
    <div class="container-fluid">
      <router-link class="navbar-brand" to="/">{{ blogName }}</router-link>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <router-link class="nav-link" to="/">首页</router-link>
          </li>
          <li class="nav-item" v-if="isAdmin">
            <router-link class="nav-link" to="/admin">管理面板</router-link>
          </li>
        </ul>
        <ul class="navbar-nav">
          <li class="nav-item" v-if="!isLoggedIn">
            <router-link class="nav-link" to="/login">登录</router-link>
          </li>
          <li class="nav-item dropdown" v-else>
            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              {{ username }}
            </a>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
              <li><a class="dropdown-item" href="#" @click.prevent="logout">退出</a></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'NavBar',
  inject: ['globalSettings'], // Inject global settings
  data() {
    return {
      isLoggedIn: false,
      isAdmin: false,
      username: '',
      blogName: '我的博客', // Default, will be overridden by globalSettings
      navbarStyle: { // Default, will be overridden by globalSettings
        backgroundColor: '#343a40',
        color: '#ffffff'
      }
    }
  },
  created() {
    this.checkLoginStatus();
    this.applyGlobalSettings();
  },
  watch: {
    $route: 'checkLoginStatus', // Watch for route changes to update login status
    globalSettings: { // Watch for changes in globalSettings
      handler: 'applyGlobalSettings',
      deep: true
    }
  },
  methods: {
    checkLoginStatus() {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      this.isLoggedIn = !!token;
      this.isAdmin = user && user.role === 'admin';
      this.username = user ? user.username : '';
    },
    applyGlobalSettings() {
      if (this.globalSettings) {
        this.blogName = this.globalSettings.blogName || '我的博客';
        this.navbarStyle.backgroundColor = this.globalSettings.navbarBackgroundColor || '#343a40';
        this.navbarStyle.color = this.globalSettings.navbarTextColor || '#ffffff';
      }
    },
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.isLoggedIn = false;
      this.isAdmin = false;
      this.username = '';
      this.$router.push('/login');
    }
  }
}
</script>

<style scoped>
.navbar-brand,
.nav-link {
  color: var(--navbar-text-color, #ffffff) !important; /* Use CSS variable for dynamic color */
}
</style>
