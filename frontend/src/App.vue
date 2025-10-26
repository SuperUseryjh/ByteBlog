<template>
  <div id="app">
    <NavBar />
    <div class="container mt-4">
      <router-view />
    </div>
    <div v-html="customScripts"></div>
  </div>
</template>

<script>
import NavBar from './components/Navbar.vue'

export default {
  name: 'App',
  inject: ['globalSettings'],
  components: {
    NavBar
  },
  data() {
    return {
      customScripts: ''
    };
  },
  created() {
    this.applyCustomScripts();
  },
  watch: {
    globalSettings: {
      handler: 'applyCustomScripts',
      deep: true
    }
  },
  methods: {
    applyCustomScripts() {
      if (this.globalSettings && this.globalSettings.customScripts) {
        this.customScripts = this.globalSettings.customScripts;
      } else {
        this.customScripts = '';
      }
    }
  }
}
</script>

<style>
/* Global styles if any */
</style>