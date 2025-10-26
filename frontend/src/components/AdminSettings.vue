<template>
  <div class="admin-settings">
    <h2>网站设置</h2>
    <form @submit.prevent="saveSettings">
      <div class="mb-3">
        <label for="blogName" class="form-label">博客名称</label>
        <input type="text" class="form-control" id="blogName" v-model="settings.blogName">
      </div>
      <div class="mb-3">
        <label for="navbarBackgroundColor" class="form-label">导航栏背景颜色</label>
        <input type="color" class="form-control form-control-color" id="navbarBackgroundColor" v-model="settings.navbarBackgroundColor">
      </div>
      <div class="mb-3">
        <label for="navbarTextColor" class="form-label">导航栏文本颜色</label>
        <input type="color" class="form-control form-control-color" id="navbarTextColor" v-model="settings.navbarTextColor">
      </div>
      <div class="mb-3">
        <label for="customScripts" class="form-label">自定义脚本/插件 (HTML/JS/CSS)</label>
        <textarea class="form-control" id="customScripts" rows="10" v-model="settings.customScripts"></textarea>
        <small class="form-text text-muted">在此处添加自定义 HTML、JavaScript 或 CSS 代码。例如：&lt;script&gt;alert('Hello');&lt;/script&gt; 或 &lt;style&gt;body { background-color: lightblue; }&lt;/style&gt;</small>
      </div>
      <div v-if="message" :class="{'alert': true, 'alert-success': !error, 'alert-danger': error}">{{ message }}</div>
      <button type="submit" class="btn btn-primary">保存设置</button>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AdminSettings',
  inject: ['globalSettings'],
  data() {
    return {
      settings: {
        blogName: '',
        navbarBackgroundColor: '',
        navbarTextColor: '',
        customScripts: ''
      },
      message: null,
      error: false
    };
  },
  created() {
    this.loadSettings();
  },
  methods: {
    loadSettings() {
      if (this.globalSettings) {
        this.settings = { ...this.globalSettings };
      }
    },
    async saveSettings() {
      this.message = null;
      this.error = false;
      try {
        const token = localStorage.getItem('token');
        await axios.put('http://localhost:3000/settings', this.settings, {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.message = '设置已成功保存！';
        // Optionally, refresh global settings in main.js or emit an event
        // For now, a page refresh might be needed to see all changes
        window.location.reload(); // Simple way to apply changes globally
      } catch (error) {
        this.error = true;
        this.message = error.response.data.error || '保存设置失败。';
        console.error('Error saving settings:', error);
      }
    }
  }
};
</script>
